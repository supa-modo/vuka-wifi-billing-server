-- Migration: Create RADIUS tables for FreeRADIUS integration
-- File: 004_create_radius_tables.sql

-- RADIUS Check table (User credentials and attributes)
CREATE TABLE IF NOT EXISTS radius_check (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT '',
    user_session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Reply table (User reply attributes)
CREATE TABLE IF NOT EXISTS radius_reply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT '',
    user_session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Accounting table (Session tracking)
CREATE TABLE IF NOT EXISTS radius_accounting (
    id SERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL DEFAULT '',
    acctuniqueid VARCHAR(32) NOT NULL DEFAULT '',
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    realm VARCHAR(64) DEFAULT '',
    nasipaddress INET NOT NULL,
    nasportid VARCHAR(15) DEFAULT NULL,
    nasporttype VARCHAR(32) DEFAULT NULL,
    acctstarttime TIMESTAMP NULL DEFAULT NULL,
    acctupdatetime TIMESTAMP NULL DEFAULT NULL,
    acctstoptime TIMESTAMP NULL DEFAULT NULL,
    acctinterval INTEGER DEFAULT NULL,
    acctsessiontime INTEGER DEFAULT NULL,
    acctauthentic VARCHAR(32) DEFAULT NULL,
    connectinfo_start VARCHAR(50) DEFAULT NULL,
    connectinfo_stop VARCHAR(50) DEFAULT NULL,
    acctinputoctets BIGINT DEFAULT NULL,
    acctoutputoctets BIGINT DEFAULT NULL,
    calledstationid VARCHAR(50) NOT NULL DEFAULT '',
    callingstationid VARCHAR(50) NOT NULL DEFAULT '',
    acctterminatecause VARCHAR(32) NOT NULL DEFAULT '',
    servicetype VARCHAR(32) DEFAULT NULL,
    framedprotocol VARCHAR(32) DEFAULT NULL,
    framedipaddress INET DEFAULT NULL,
    user_session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Post-Auth table (Authentication logging)
CREATE TABLE IF NOT EXISTS radius_postauth (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    pass VARCHAR(64) NOT NULL DEFAULT '',
    reply VARCHAR(32) NOT NULL DEFAULT '',
    authdate TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Group Check table (Group-based policies)
CREATE TABLE IF NOT EXISTS radius_groupcheck (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS Group Reply table (Group reply attributes)
CREATE TABLE IF NOT EXISTS radius_groupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT '',
    prio INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RADIUS User Group table (User-group associations)
CREATE TABLE IF NOT EXISTS radius_usergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_radius_check_username ON radius_check(username);
CREATE INDEX IF NOT EXISTS idx_radius_reply_username ON radius_reply(username);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_username ON radius_accounting(username);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_session ON radius_accounting(acctsessionid);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_start ON radius_accounting(acctstarttime);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_stop ON radius_accounting(acctstoptime);
CREATE INDEX IF NOT EXISTS idx_radius_usergroup_username ON radius_usergroup(username);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_nas ON radius_accounting(nasipaddress);
CREATE INDEX IF NOT EXISTS idx_radius_accounting_calling ON radius_accounting(callingstationid);

-- Update user_sessions table for better integration
-- Note: These columns are already handled by the UserSession model
-- The model uses username/password fields directly, not radius_username/radius_password
-- Adding these for backward compatibility but they may not be used
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS radius_username VARCHAR(64);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS radius_password VARCHAR(64);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_mac_addresses TEXT[];
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS data_usage_mb INTEGER DEFAULT 0;

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_radius_password VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS radius_enabled BOOLEAN DEFAULT true;

-- Add sessionId reference to payments table (camelCase)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES user_sessions(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_sessions_radius_username ON user_sessions(radius_username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions("expiresAt");
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);

-- Insert default group policies for plan-based access control
INSERT INTO radius_groupcheck (groupname, attribute, op, value) VALUES
('plan_1', 'Session-Timeout', ':=', '7200'),    -- 2 hours
('plan_2', 'Session-Timeout', ':=', '10800'),   -- 3 hours  
('plan_3', 'Session-Timeout', ':=', '86400'),   -- 24 hours
('plan_4', 'Session-Timeout', ':=', '604800')   -- 1 week
ON CONFLICT DO NOTHING;

-- Insert default reply attributes for bandwidth limiting
INSERT INTO radius_groupreply (groupname, attribute, op, value, prio) VALUES
('plan_1', 'Mikrotik-Rate-Limit', '=', '1M/3M', 1),     -- 3M down, 1M up
('plan_2', 'Mikrotik-Rate-Limit', '=', '2M/5M', 1),     -- 5M down, 2M up
('plan_3', 'Mikrotik-Rate-Limit', '=', '2M/5M', 1),     -- 5M down, 2M up  
('plan_4', 'Mikrotik-Rate-Limit', '=', '5M/10M', 1)     -- 10M down, 5M up
ON CONFLICT DO NOTHING;

-- Create a view for easy session monitoring
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
    us.id as session_id,
    us.username,
    us.username as radius_username, -- Use username as RADIUS username
    us."deviceCount",
    us."expiresAt",
    us."sessionStart",
    us."updatedAt" as last_activity, -- Use updatedAt as last activity
    ROUND((us."bytesIn" + us."bytesOut") / (1024 * 1024) * 100) / 100 as data_usage_mb, -- Calculate from bytes
    u."phoneNumber",
    p.name as plan_name,
    p."bandwidthLimit",
    p."durationHours",
    ra.callingstationid as device_mac,
    ra.acctstarttime,
    ra.acctsessiontime,
    ra.acctinputoctets,
    ra.acctoutputoctets,
    ra.nasipaddress
FROM user_sessions us
JOIN users u ON us."userId" = u.id
JOIN plans p ON us."planId" = p.id
LEFT JOIN radius_accounting ra ON us.username = ra.username AND ra.acctstoptime IS NULL
WHERE us.status = 'active' 
AND us."expiresAt" > NOW();

COMMENT ON TABLE radius_check IS 'RADIUS user authentication attributes';
COMMENT ON TABLE radius_reply IS 'RADIUS user reply attributes';
COMMENT ON TABLE radius_accounting IS 'RADIUS session accounting data';
COMMENT ON TABLE radius_postauth IS 'RADIUS authentication attempts log';
COMMENT ON TABLE radius_groupcheck IS 'RADIUS group-based check attributes';
COMMENT ON TABLE radius_groupreply IS 'RADIUS group-based reply attributes';
COMMENT ON TABLE radius_usergroup IS 'RADIUS user to group associations';
COMMENT ON VIEW active_sessions_view IS 'Combined view of active sessions with user and accounting data';