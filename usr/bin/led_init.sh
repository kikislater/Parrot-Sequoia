#!/bin/sh/

ULOG="ulogger -t 'led-init'"
ULOGE="${ULOG} -p E"
ULOGW="${ULOG} -p W"
ULOGI="${ULOG} -p I"
ULOGD="${ULOG} -p D"


on_add(){
    # set let in open drain mode
    kernel_path=${1}
    i2c_address=${2}
    i2ctool -d /dev/i2c-3 ${i2c_address} 0x01 0x01
    if [ $? -ne 0 ]; then
        return
    fi

    # Irradiance leds
    for color in red green blue; do
        /bin/rm -f /dev/irradiance_${color}
        /bin/ln -fs /sys/class/leds/${kernel_path%:*}:${color} /dev/irradiance_${color}
    done
    led-cli reset 1
}
eval on_${ACTION} $*
#END

