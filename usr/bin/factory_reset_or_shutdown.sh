#!/bin/sh

led-cli change body_shutting_down

# Stop all processes that may access to eMMC
sprop sicilia_all_services "stop"
sleep 1

# Synchronize filesystems
sync
# Release pagecache, dentries and inodes
echo "3" > /proc/sys/vm/drop_caches

# Unmount all filesystems
#data
umount /dev/mmcblk0p6
# update
umount /dev/mmcblk0p7
# factory
umount /dev/mmcblk0p5

# Erase data and update by default
partitions_to_format="/dev/mmcblk0p6 /dev/mmcblk0p7"
if [ "${2}" ]; then
    partitions_to_format="${2}"
fi

# Now we can either format, shutdown or simply pass a dummy arg like "nothing" to just pstop all services and unmount partitions
if [ "${1}" = "reset" ]; then
    for partition in ${partitions_to_format}; do
        mkfs.ext4 -F ${partition}
    done

    # Reboot
    reboot
elif [ "${1}" = "shutdown" ]; then
    sprop sys.poweroff 1
fi

