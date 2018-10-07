#!/bin/sh

# Kill cleanly ulogcatd
/usr/bin/pstart flush_ulog
/usr/bin/pterm ulogcatd

#first recover all logs in reversed order
log_dir=$(gprop ro.ulog_data.path)
full_log=${log_dir}/full.log
session_prefix=${log_dir}/session_

session_separator="====================== ULOGCAT SESSION START  ======================"

/bin/rm -f ${full_log}
/bin/rm -f ${session_prefix}*

# parse log files in reverse order to have it as one ordered file.
for logfile in $(ls ${log_dir}/log*|sort -t'.' -k 2 -nr); do
    cat ${logfile} >> ${full_log}
done

index=0
# Create session files from full log
while read line; do
    if echo "${line}"|grep -qe "${session_separator}"; then
        let index++
        echo "creating ${session_prefix}${index}.log"
    fi
    echo ${line} >> ${session_prefix}${index}.log
done < ${full_log}

# Free a little space...
/bin/rm -f ${full_log}
#END
