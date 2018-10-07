
# wait for boxinit to set properly its persistent properties
sleep 1

# Change usb config accordingly to a previous persistant environment or a default one
# If no persistent variable is found
if [ -z "$(gprop persist.sys.usb.config)" -o "$(gprop persist.sys.usb.config)" = "none" ]; then 
    sprop sys.usb.config "ptp,rndis";
else 
    sprop sys.usb.config "$(gprop persist.sys.usb.config)"; 
fi

