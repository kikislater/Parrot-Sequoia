virt_dev=/sys/class/android_usb/android0
DLOG="echo > /dev/kmsg"

if [ $# -ne 0 ]; then
    # Relaunch this script as if launched via property setting
    sprop sys.usb.config $1
    exit 0
fi

if [ ! -e "${virt_dev}" ]; then
    ${DLOG} "[E] Can't switch android usb properties. The gadget is not configured."
    exit 1
fi

ret=0
prop_usb_config=$(gprop sys.usb.config)

### Custom part
# Services set based on gadget supported functions
adb_services="adbd"
mtp_services="mtp_server"
ptp_services="mtp_ptp_srv ptpip_server"
rndis_services="rndis_up dnsmasq_rndis0"

# Manually fill these two variables
# list of *_services variables without the _services part
list_services="adb mtp ptp rndis"
# list of all *_services variables for pstop command
all_services="${adb_services} ${mtp_services} ${ptp_services} ${rndis_services}"
### End of Custom part

### Functions definitions
reset_gadget(){
    pterm ${all_services}
    echo 0 > ${virt_dev}/enable
    echo 0 > ${virt_dev}/bDeviceClass
}

set_gadget_function(){
    echo 0 > ${virt_dev}/enable
    echo ${prop_usb_config} > ${virt_dev}/functions
    echo 1 > ${virt_dev}/enable
}
### End of definition

if [ -n "${prop_usb_config}" -a "${prop_usb_config}" = "none" ]; then
    reset_gadget
    exit ${ret}
fi

# Use built-ins properties
reset_gadget
sleep 1
set_gadget_function ${prop_usb_config}
# Launch adequate boxinit services based on list above
for _service in ${list_services}; do
    if echo ${prop_usb_config}|grep -qe ${_service}; then
        ${DLOG} "[DEBUG] test for ${_service} found"
        eval pstart \$${_service}_services
    fi
done
sleep 1

if [ "$(cat ${virt_dev}/state)" = "CONFIGURED" ]; then
    ${DLOG} "USB Gadget configured successfully"
else
    ${DLOG} "Issue while configuring USB Gadget with '${1}' functions"
    ret=1
fi

exit ${ret}
#END
