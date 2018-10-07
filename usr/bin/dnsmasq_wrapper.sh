#!/bin/sh
set -e

interface=$1
leaseconf=${2}

address=$(ip address show ${interface})
address=${address/*inet /}
address=${address/ */}

# If debugging is needed, activate it accordingly
if [ "${ULOG_LEVEL}" == "D" ]; then
	# option with debug mode included
	foreground_opt="--no-daemon"
else
	foreground_opt="--keep-in-foreground"
fi

if [ "${#address}" -gt 16 ]; then
	ulogger -p E -t $(basename $0) "no valid ip address found for ${interface}"
	exit 1
fi

ip=${address%%/*}
netbits=${address##*/}

# the netmask could be computed from the netbits, but would complicate the
# sed command a lot
netmask=255.255.255.0
ip_first_bytes=${address%.*}

# If provided through environment, use it, else check the return of hostname command
if [ -n "${DNSMASQ_HOSTNAME}" ]; then
	hostname=${DNSMASQ_HOSTNAME}
else
	hostname=$(hostname)
fi

# check if a lease file should be used or not
if [ "${leaseconf}" == "noleasefile" ]; then
	leaseparam="--leasefile-ro"
else
	leasefile=/var/lib/misc/dhcp_${interface}.leases
	leaseparam="--dhcp-leasefile=${leasefile}"
	# If we cannot create the lease file (may be due to fs issue)
	# We continue without lease to make sure we still have the connection
	touch ${leasefile} || leaseparam="--leasefile-ro"
fi
# Centralize all wanted sed changes in a file
sed_tmp_file=/tmp/dnsmasq_wrapper_update_file_${interface}.sed
cat > ${sed_tmp_file} <<EOF
s/@@@DNSMASQ_INTERFACE@@@/${interface}/g
s/@@@DNSMASQ_NETMASK@@@/${netmask}/g
s/@@@DNSMASQ_IP_FIRST_BYTES@@@/${ip_first_bytes}/g
s/@@@DNSMASQ_HOSTNAME@@@/${hostname}/g
s,@@@DNSMASQ_ADDRESS@@@,${address},g
EOF

dnsmasq_conf=/var/run/dnsmasq/dnsmasq.conf.${interface}
sed -f ${sed_tmp_file} \
	/usr/share/dnsmasq/dnsmasq.conf.template > \
	${dnsmasq_conf}

# If there is a custom dns config for the interface
dns_template=/usr/share/dnsmasq/dnsmasq.conf.dns.${interface}.template
if [ -r "${dns_template}" ]; then
	sed -f ${sed_tmp_file} \
		${dns_template} >> \
		${dnsmasq_conf}
else
	# do not set gateway and dns for the interface
	cat /usr/share/dnsmasq/dnsmasq.nodns.conf >> ${dnsmasq_conf}
fi
rm ${sed_tmp_file}

exec /usr/bin/ulogwrapper /usr/sbin/dnsmasq ${foreground_opt} \
	--conf-file=/var/run/dnsmasq/dnsmasq.conf.${interface} \
	--pid-file=/var/run/dnsmasq/dnsmasq.pid.${interface} \
	$leaseparam
