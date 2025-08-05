#!/bin/bash
echo "í´§ Setting up FreeRADIUS Accounting..."

# Enable accounting in default site
sudo sed -i 's/#.*accounting/accounting/' /etc/freeradius/3.0/sites-available/default

# Configure accounting in radiusd.conf
echo "
# Accounting configuration
accounting {
    detail
    sql
    exec
}
" | sudo tee -a /etc/freeradius/3.0/radiusd.conf

# Enable accounting in SQL module
sudo sed -i '/accounting_table/s/^#//' /etc/freeradius/3.0/mods-available/sql

echo "âœ… FreeRADIUS accounting configured!"
echo "í´„ Restart FreeRADIUS: sudo systemctl restart freeradius"
