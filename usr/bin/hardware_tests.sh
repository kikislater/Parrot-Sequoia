#!/bin/sh
# Sicilia irradiance hardware  test
# Press the button to enable (-> orange LED), press again to stop (-> cyan LED)
# @author Julien Thomas
# @version 1.0.0

usage(){
    echo "Usage : ${0} [options]

Below is the list of possible options. a [no-] does the opposite of what is indicated (useful to overrides default variables).

    -h / --help : Prints this help and exit
    --debug : debug print of the commands being executed
    --[no-]sd : Store logs and images on SD Card (if accessible)
    --[no-]wifi : Activate stress wifi mode in addition to the captures.
    --[no-]auto : Automatically starts acquiring datas when ready. Go to error in case of timeout issue
    --[no-]activate-heater : Activate the heater while using sensors_ir
    --[no-]alternate : Alternate between sd card (if available) and local storage
    --alternate-timer : Timer between two writes, in seconds. This option automatically set alternate option to true.
    --timelapse value : Set timelapse (FPS) for photos
    --main-exposure value : Set exposure time (in µs) for main cameras, default to (70000). This value is for indoor only !
    --mono-exposure value : Set exposure time (in µs) for mono cameras, default to (70000). This value is for indoor only !
    "
}

#### Initialization part
# set eMMC default and base directory (default also is mtp root directory)
# Note that at least the default MUST exists before launching the script
default_basepath=/data/medias
dest_basepath=/data/medias
use_sd=false

ULOG_TAG="hardware_tests"
ULOGI="ulogger -t '${ULOG_TAG}' -p I"
ULOGW="ulogger -t '${ULOG_TAG}' -p W"
ULOGE="ulogger -t '${ULOG_TAG}' -p E"
HUMAN_TIMEOUT=500000

auto=false
test_wifi=false
photo_timelapse=1.5
main_exposure_time=70000
mono_exposure_time=70000
alternate_write=false
alternate_timer=15
activate_heater=false
# Option parsing
config_file=/etc/hardware_tests.conf
if [ -r "${config_file}" ]; then
    source ${config_file}
fi
while [ $# -ne 0 ]; do
    case ${1} in
        --help|-help|-h)usage; exit 0;;
        --debug|-debug)set -x;;
        --auto|-auto)auto=true;;
        --no-auto|-no-auto)auto=false;;
        --activate-heater|-activate-heater) activate_heater=true;;
        --no-activate-heater|-no-activate-heater) activate_heater=false;;
        --alternate|-alternate)alternate_write=true;;
        --no-alternate|-no-alternate)alternate_write=false;;
        --alternate-timer|-alternate-timer)shift; alternate_write=true; alternate_timer=$1;;
        --dest|-dest)shift; dest_basepath=${1};;
        --main-exposure|-exposure)shift; main_exposure_time=${1};;
        --mono-exposure|-exposure)shift; mono_exposure_time=${1};;
        --sd|-sd)use_sd=true;;
        --no-sd|-no-sd)use_sd=false;;
        --timelapse|-timelapse|-t)shift; photo_timelapse=${1};;
        --wifi|-wifi)test_wifi=true;;
        --no-wifi|-no-wifi)test_wifi=false;;
        *);;
    esac
    shift;
done

if ${activate_heater}; then
# Active heating gpio
    ACTIVE_HEATER=270
    PINS="${ACTIVE_HEATER}"
    for pin in ${PINS}; do
        if [ ! -e "/sys/class/gpio/gpio$pin" ]; then
            echo "$pin" > "/sys/class/gpio/export"
        fi
    done
    # Wait for the heater gpio to be visible
    TIMEOUT=500
    TESTED_GPIO=${ACTIVE_HEATER}
    while [ ${TIMEOUT} -ne 0 ]; do
        if [ -e "/sys/class/gpio/gpio${TESTED_GPIO}" ]; then
            break;
        fi
        let TIMEOUT--
    done
    if [ ${TIMEOUT} -eq 0 ]; then
        ${ULOGE} "Gpio ${TESTED_GPIO} did not set in time... exiting"
        exit 1
    fi
    sensors_heater_opt="--heat-soft ${ACTIVE_HEATER}"
else
    sensors_heater_opt=""
fi

### End of initialization part
signal_caught(){
    keep_looping=false
}
keep_looping=true;
trap signal_caught SIGINT SIGTERM

waiting_button_pressed(){
    local button=0
    # systematically disable debug when looping to avoid flood
    while [ ${button} -eq 0 ] && ${keep_looping}; do
        button=`cat /sys/devices/platform/p7-gpio.0/gpio/gpio75/value`
        if [ ${button} -ne 0 ]; then
            break
        fi
        usleep 50000
    done
    # Specific wait because we are simply humans
    # the only fact of pushing the button could else trigger the !=0 condition
    # twice in a row
    usleep ${HUMAN_TIMEOUT}
}

get_next_empty_dir(){
    # Check for existing directories
    local i=0
    local curdir=""
    local basedir=""
    if ${use_sd}; then
        # Get first vfat device that is read/write
        basedir=$(awk '/vfat/{ if($4 ~ /\<rw\>/){print $2;}}' /proc/self/mounts|head -1)
    else
        basedir=${dest_basepath}
    fi
    if [ -z "${basedir}" -o ! -d "${basedir}" ]; then
        ${ULOGW} "'${basedir}' was incorrect so we use ${default_basepath} to store datas"
        basedir=${default_basepath}
    fi
    # For each partition in reverse to avoid having / in first place
    for _partition in $(df -P 2>&1|sed -ne 's/.* //g;/^\//p'|sort -r); do
        # Get the associated partition with basedir
        if echo ${basedir}|grep -q -e "${_partition}"; then
            # Recover the disk space
            _partition=$(echo ${_partition}|sed -e 's#/#\\/#g')
            # if disk spaces equals or exceeds 99%
            if [ $(df -P 2>&1|awk '/'${_partition}'/{printf gensub("%","","G",$5);}') -ge 99 ]; then
                # if basedir is already default_basepath, exit with error
                if [ "${basedir}" == "${default_basepath}" ]; then
                    ${ULOGE} "No more disk space available. Exiting"
                    exit 2
                fi
                # else, restore to default basepath
                ${ULOGW} "Not enough space left on ${basedir}. Fallback on ${default_basepath}"
                basedir=${default_basepath}
            fi
            break
        fi
    done

    while true
    do
        curdir=${basedir}/${i}
        # if dir exists
        if [ -d "${curdir}" ]; then
            # check if empty
            if [ $(ls ${curdir}/* 2>/dev/null|wc -l) -eq 0 ];then
                break
            fi
            i=`expr ${i} + 1`
        # No dir found, so we take the next number.
        else
            break
        fi
    done
    # We voluntarily do not set the -p option to make sure that errors are caught
    if ! mkdir ${curdir}; then
        ret=$?
        ${ULOGE} "Error while creating ${curdir}, aborting."
        exit ${ret}
    fi
    cd ${curdir}
}

stop(){
    # Enable default LEDs

    #args are : trigger red green blue
    /bin/sh /usr/bin/led_debug.sh main --trigger none --red 128 --green 128 --blue 128

    if ${test_wifi}; then
        # Stop WiFi
        calibrator wlan0 wl18xx_plt stop_tx
    fi
}
start()
{
    local params_filename="params.csv"
    local sensors_main_filename="capture_main_sensors.csv"
    local sensors_ir_filename="capture_irradiance_sensors.csv"
    local sensors_expo_filename="capture_irradiance_exposure_sensors.csv"
    local pids_to_stop=""
    # Set the LEDs to orange, cuz it's time to work
    /bin/sh /usr/bin/led_debug.sh main --trigger none --red 128 --green 25 --blue 0

    # Set irradiance led (will alternate red, green, blue):
    shift $#
    set -- ${IRRAD_COLORS}
    /bin/sh /usr/bin/led_debug.sh irradiance --clear --trigger none --red ${1} --green ${2} --blue ${3}
    IRRAD_COLORS="${3} ${1} ${2}"

    if ${test_wifi}; then
        # Start WiFi transmission
        calibrator wlan0 wl18xx_plt start_tx 300 19 2000 0 0 1 0 0 00:11:22:33:44:55 01:02:03:04:05:06 1
    fi

    ### Capture Zone
    # Setup temperature file CSV header
    echo "DDR params" >> ${params_filename}
    i2ctool -d /dev/i2c-0 -a 2 -r 2 0x31 0x6 >> ${params_filename}
    i2ctool -d /dev/i2c-0 -a 2 -r 2 0x31 0x7 >> ${params_filename}
    echo "DVFS params" >> ${params_filename}
    frequency_vstep >> ${params_filename}

    # Launch 4 captures with TIFF encoding and MAIN as jpeg. Capture is at 1.5fps
    /usr/bin/test_imaging -a -t ${photo_timelapse} -p ./ -m ${mono_exposure_time} -e ${main_exposure_time} >/dev/null 2>&1 &
    pids_to_stop="${pids_to_stop} $!"

    # Main sensors capture
    /usr/bin/sensors_main --gm --raw --freq 1000 --imu-name Main --rt --ready-use 1 --sys-temp \
        --log ${sensors_main_filename} >/dev/null 2>&1 &
    pids_to_stop="${pids_to_stop} $!"

    # Swap with commented line below if you want only exposure sensors
    /usr/bin/sensors_ir --raw --freq 50 ${sensors_heater_opt} --imu-name IR --ir --rt --akm-dev /dev/i2c-3 --mpu-dev /dev/i2c-6 --sys-temp \
        --log ${sensors_ir_filename} >/dev/null 2>&1 &
    #irradiance_sensors --frequency 10 --output ${sensors_expo_filename} &
    pids_to_stop="${pids_to_stop} $!"
    ### END of Capture Zone

    # We keep this even in auto mode as it will acts as an infinite loop, or maybe to relaunch the capture
    has_debug=false
    if [ "${-/x/}" != "${-}" ]; then
        has_debug=true
        set +x
    fi
    if ${alternate_write}; then
        sleep ${alternate_timer}
    else
        waiting_button_pressed
    fi
    ${has_debug} && set -x

    # kill sub processes cleanly
    for _pid in ${pids_to_stop}; do
        kill -15 ${_pid}
    done
    # Filter gps infos for the session, saving the full version and the one compatible with gps visualizer
    if [ -r "${default_basepath}/generated_nmea.txt" ]; then
        cp ${default_basepath}/generated_nmea.txt generated_nmea_full.txt
        sed -ne '/GNRMC/s/GNRMC/GPRMC/p' generated_nmea_full.txt > gps_coords.txt
    fi
    sync
}

# save current ulogcat to a file, just in case of.
ulogcat -lkud -v long > ${dest_basepath}/ulogcat_init.log 2>&1
# Forced to 0 to avoid a kill at first launch
ulogcat_pids=0

if ${test_wifi}; then
    # Put WiFi chip in PLT mode
    sleep 1
    calibrator wlan0 plt power_mode on
    sleep 2
    calibrator wlan0 wl18xx_plt stop_tx
    calibrator wlan0 wl18xx_plt tune_channel  7 0 2
    calibrator wlan0 wl18xx_plt set_tx_power 20000 0 0 7 1  0  0 1 0 0 0 0
fi

# Stop services that may hamper hardware_tests
pterm palermo sensors_main sensors_main_dbg sensors_ir sensors_ir_dbg

# Init PROTOB irradiance led sensors
# Will not pursue if no address found
i2c_reg="i2ctool -d /dev/i2c-3 0x62"
if ${i2c_reg} 0x1 0x1; then
    # fully initialize
    ${i2c_reg} 0x2 0x20
    ${i2c_reg} 0x3 0x20
    ${i2c_reg} 0x4 0x20
    ${i2c_reg} 0x5 0x20
    ${i2c_reg} 0x8 0x00
    ${i2c_reg} 0x0 0x00
fi
IRRAD_COLORS="50 0 0"
irrad_total=$(echo ${IRRAD_COLORS}|wc -w)
irrad_index=0

${ULOGW} "Welcome in hardware tests"
while ${keep_looping}; do
    has_debug=false
    if [ "${-/x/}" != "${-}" ]; then
        has_debug=true
        set +x
    fi
    if ${alternate_write}; then
        if ${use_sd}; then
            use_sd=false
        else
            use_sd=true
        fi
    fi
    ${auto} || waiting_button_pressed
    ${has_debug} && set -x

    get_next_empty_dir
    test ${ulogcat_pids} != "0" && kill -15 ${ulogcat_pids}
    ulogcat -c
    ulogcat -lu -v long -f ${PWD}/current_session.log >/dev/null 2>&1 &
    ulogcat_pids="$!"
    ulogcat -lk -v long -f ${PWD}/dmesg.log >/dev/null 2>&1 &
    ulogcat_pids="${ulogcat_pids} $!"
    ${ULOGI} "Starting capture"
    start
    ${ULOGI} "Halting capture"
    stop
done
#END
