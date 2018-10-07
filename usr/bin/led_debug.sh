#!/bin/sh/

usage(){
    echo ""
    echo "Usage: $0 main|irradiance --trigger trigger_type --red color --green color --blue color|--clear"
    echo ""
    echo "With no arguments, print all leds infos (brightness and trigger of irradiance and mainboard leds"
    echo "With arguments, set values according to what is set or clear the leds infos (trigger to none and colors to 0)"
    echo ""
    exit 0
}
# If an argument is given, set it for brightness or trigger according to its type
# else print all values
print_all=true

main_leddir="sicilia"
irradiance_leddir="ncp5623c:irradiance"
trigger=none
red=0
green=0
blue=0
do_leds="red green blue"
if [ $# -gt 0 ]; then
    boards=""
    do_leds=""
    print_all=false
    while [ $# -ne 0 ]; do
        case ${1} in
            main) boards="${boards} ${main_leddir}";;
            irradiance) boards="${boards} ${irradiance_leddir}";;
            --trigger) shift; trigger=$1;;
            --red) shift; red=$1; do_leds="${do_leds} red";;
            --green) shift; green=$1; do_leds="${do_leds} green";;
            --blue) shift; blue=$1; do_leds="${do_leds} blue";;
            --clear) trigger=none; red=0; green=0; blue=0; do_leds="red green blue";;
            show) print_all=true; do_leds="red green blue";;
            pca9633|pca) irradiance_leddir="pca9633:irradiance";;
            help|-help|--help|-h)usage;;
            -x|--debug|-debug)set -x;;
            *)red=$1; green=$1; blue=$1;;
        esac
        shift
    done
fi
# by caution if nothing is provided, apply on both boards
boards=${boards:-"${main_leddir} ${irradiance_leddir}"}
do_leds=${do_leds:-"red green blue"}

for board in ${boards}; do
    main_board_led_basepath="/sys/class/leds/${board}"
    for color in ${do_leds}; do
        if [ ! -e "${main_board_led_basepath}:${color}/brightness" ]; then
            ${ULOGE} "Can't correctly set the leds ! Exiting"
            exit 1
        fi
        if ${print_all}; then
            echo "${main_board_led_basepath}:${color}/brightness =>" $(cat "${main_board_led_basepath}:${color}/brightness")
            echo "${main_board_led_basepath}:${color}/trigger =>" $(cat "${main_board_led_basepath}:${color}/trigger")
        else
            echo $trigger > "${main_board_led_basepath}:${color}/trigger"
            eval echo \$${color} > "${main_board_led_basepath}:${color}/brightness"
        fi
    done
done
#END
