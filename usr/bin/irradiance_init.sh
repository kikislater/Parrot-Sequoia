#! /bin/sh/

ULOG="ulogger -t 'irradiance-init'"
ULOGE="${ULOG} -p E"
ULOGW="${ULOG} -p W"
ULOGI="${ULOG} -p I"
ULOGD="${ULOG} -p D"

irradiance_dest="/data"
irradiance_serial_file="${irradiance_dest}/irradiance_serial.txt"

update_irradiance(){
    irradiance_thermal_prefix="IR_Thermal_IMU_"
    bias_file="${irradiance_dest}/${irradiance_thermal_prefix}bias.fact.csv"
    ortho_file="${irradiance_dest}/${irradiance_thermal_prefix}ortho.fact.csv"
    sensitivity_file="${irradiance_dest}/IR_sensitivity.csv"
    serial=$(lsusb -v -d 19cf:|grep "iSerial"|awk '{print $NF;}')
    reload_calibration_data=false
    if [ -z "${serial}" ]; then
        ${ULOGE} "Could not find a valid irradiance"
        return 1
    fi
    # Check if serial has evolved (or first time)
    if [ ! -e "${irradiance_serial_file}" -o "$(cat ${irradiance_serial_file})" != "${serial}" ]; then
        echo "${serial}" > "${irradiance_serial_file}"
        # Reinit calibration in this case
        rm -f ${irradiance_dest}/IR_magneto_calibration.conf
        # and thermal files
        reload_calibration_data=true
    fi
    # in case of (un)voluntarily suppression
    if [ ! -e "${bias_file}" -o ! -e "${ortho_file}" -o ! -e "${sensitivity_file}" ]; then
        reload_calibration_data=true
    fi
    if ${reload_calibration_data}; then
        ${ULOGI} "Recovering eeprom infos from irradiance"
        # Remove user thermal files when we reload
        rm ${bias_file/\.fact/.user} ${ortho_file/\.fact/.user} ${sensitivity_file}
        /usr/bin/irradiance-imu-read -d /dev/i2c-3 -b ${bias_file} -o ${ortho_file} -i ${sensitivity_file}
    fi

    if [ -x /usr/bin/calibration_check ]; then
      if ${reload_calibration_data}; then
        /usr/bin/calibration_check --ir --force
      else
        /usr/bin/calibration_check --ir
      fi
    fi
}

on_add(){
    mount -woremount / /
    if echo ${DEVPATH}|grep -q -e "/1-1:"; then
        # We are on a furuno
        ${ULOGI} "Loading furuno gps config"
        cp /etc/gps_config_furuno.txt /etc/gps_config.txt
    else
        # We are normally on ublox
        ${ULOGI} "Loading ublox gps config"
        cp /etc/gps_config_ublox.txt /etc/gps_config.txt
    fi
    mount -roremount / /

    update_irradiance

    # Add heater gpio when irradiance is plugged in
    if [ ! -e "/sys/class/gpio/gpio270" ]; then
        echo 270 > /sys/class/gpio/export
    fi

    if [ "${1}" != "--no-sensors" ]; then
        pstart sensors_ir
    fi

}
on_remove(){
    if [ "${1}" != "--no-sensors" ]; then
        pterm sensors_ir
    fi
}

# The udev rules indicates if the device is "add" or "remove" through ACTION environment variable
eval on_${ACTION} $*
#END
