ULOG_TAG="ext4_checker"
ULOGD="ulogger -t '${ULOG_TAG}' -p D"
ULOGI="ulogger -t '${ULOG_TAG}' -p I"
ULOGW="ulogger -t '${ULOG_TAG}' -p W"
ULOGE="ulogger -t '${ULOG_TAG}' -p E"

factory_partition=/dev/mmcblk0p5
data_partition=/dev/mmcblk0p6
update_partition=/dev/mmcblk0p7

# When logging elements, keep the returncode of the first command
set -o pipefail

check_or_repair(){
    device=$1
    method=$2
    fsck_tool=fsck.ext4
    # Check state of the media
    ${fsck_tool} -n ${device} 2>&1|${ULOGD}
    ret=${?}
    if [ ${ret} -eq 0 ]; then
        return ${ret}
    fi
    if [ "${method}" = "format" ]; then
        ${ULOGI} "Formatting ${device} in progress..."
        /bin/sh /usr/bin/factory_reset_or_shutdown.sh reset ${device}
        return 0
    fi
    # Try to repair it
    ${ULOGW} "Filesystem ${device} is detected as corrupted. Reparation in progress..."
    /usr/bin/led-cli change body_fsck
    ${fsck_tool} -p ${device} 2>&1|${ULOGD}
    /usr/bin/led-cli stop body_fsck
    if [ ${?} -eq 0 ]; then
        ${ULOGI} "Reparation ended successfully"
        return 0
    fi
    ${ULOGE} "Issues while repairing ${device}."
    return 1
}
# remove any remaining potential arguments
shift $#
for partition in ${data_partition} ${update_partition}; do
    if ! check_or_repair ${partition} repair; then
        ${ULOGW} "Starting format of ${partition}"
        check_or_repair ${partition} format
    fi
done
return 0
#END
