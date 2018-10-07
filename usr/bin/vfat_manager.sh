ULOG_TAG="vfat_manager"
ULOGD="ulogger -t '${ULOG_TAG}' -p D"
ULOGI="ulogger -t '${ULOG_TAG}' -p I"
ULOGW="ulogger -t '${ULOG_TAG}' -p W"
ULOGE="ulogger -t '${ULOG_TAG}' -p E"

# Give some times to mount
sleep 1

# When logging elements, keep the returncode of the first command
set -o pipefail

check_or_repair(){
    fsck_tool=/usr/bin/fsck_msdos
    # Check state of the media
    ${fsck_tool} -n ${1} 2>&1|${ULOGD}
    ret=$?
    if [ ${ret} -eq 0 ] || [ ${ret} -eq 1 ]; then
        return 0
    fi
    attempt=5
    # Try to repair it
    ${ULOGW} "Filesystem ${1} is detected as corrupted. Reparation in progress..."
    /usr/bin/led-cli change irra_fsck
    while [ ${attempt} -ne 0 ]; do
        ${fsck_tool} -y ${1} 2>&1|${ULOGD}
        ret=$?
        if [ ${ret} -eq 0 ] || [ ${ret} -eq 1 ]; then
            ${ULOGI} "Reparation ended successfully"
            /usr/bin/led-cli stop irra_fsck
            return 0
        fi
        let attempt--
        sleep 1
    done
    /usr/bin/led-cli stop irra_fsck
    ${ULOGE} "Issues while repairing ${1}, please check your removable device."
    /usr/bin/led-cli change irra_hardware_malfunction
    return 1
}
# remove any remaining potential arguments
shift $#
# Get all vfat mount points
mount_file="/proc/self/mounts"
# If reparation exited unsuccessfully, exit program
if ! check_or_repair ${JUBA_STR_MOUNT_SOURCE}; then
    exit 1;
fi
# We remount the device in read-write
if grep -qe "${JUBA_STR_MOUNT_SOURCE}.*\<ro\>" ${mount_file}; then
    ${ULOGI} "Remounting ${JUBA_STR_MOUNT_SOURCE} in read-write"
    mount -woremount "${JUBA_STR_MOUNT_SOURCE}" "${JUBA_STR_MOUNT_POINT}"
fi

# In case of update, touch the file to trigg again an update because it has stopped in case of corruption
for ufile in "${JUBA_STR_MOUNT_POINT}"/*_update.plf; do
    touch ${ufile}
done
#END
