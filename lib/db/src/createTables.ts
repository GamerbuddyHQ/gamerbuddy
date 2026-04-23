export const DDL_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT NOT NULL,
    official_id_path TEXT,
    id_verified INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    bio TEXT,
    trust_factor INTEGER NOT NULL DEFAULT 50,
    profile_background TEXT,
    profile_title TEXT,
    country TEXT,
    gender TEXT,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    profile_photo_url TEXT,
    gallery_photo_urls TEXT NOT NULL DEFAULT '[]',
    gamerbuddy_id TEXT UNIQUE,
    community_banned INTEGER NOT NULL DEFAULT 0,
    is_moderator INTEGER NOT NULL DEFAULT 0,
    moderator_appointed_at INTEGER,
    trust_score INTEGER NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 0,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    is_activated INTEGER NOT NULL DEFAULT 0,
    activation_region TEXT,
    activation_paid_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    hiring_balance REAL NOT NULL DEFAULT 0,
    earnings_balance REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    game_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    objectives TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    escrow_amount REAL,
    accepted_bid_id INTEGER,
    started_at INTEGER,
    created_at INTEGER NOT NULL,
    is_bulk_hiring INTEGER NOT NULL DEFAULT 0,
    bulk_gamers_needed INTEGER,
    preferred_country TEXT DEFAULT 'any',
    preferred_gender TEXT DEFAULT 'any',
    expires_at INTEGER,
    hirer_region TEXT NOT NULL DEFAULT 'international',
    session_hours INTEGER,
    additional_goals TEXT,
    expected_duration TEXT,
    play_style TEXT
  );

  CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES game_requests(id),
    bidder_id INTEGER NOT NULL REFERENCES users(id),
    price REAL NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    discord_username TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bid_id INTEGER NOT NULL REFERENCES bids(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES game_requests(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    would_play_again TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    wallet TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS streaming_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gaming_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    voter_id INTEGER NOT NULL,
    vote_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, voter_id)
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'visible',
    category TEXT NOT NULL DEFAULT 'other',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suggestion_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    vote TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suggestion_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    parent_id INTEGER,
    body TEXT NOT NULL,
    is_admin_comment INTEGER NOT NULL DEFAULT 0,
    is_mod_comment INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS moderator_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moderator_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    meta TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    game_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    tournament_type TEXT NOT NULL,
    max_players INTEGER NOT NULL,
    current_players INTEGER NOT NULL DEFAULT 0,
    prize_pool REAL NOT NULL,
    entry_fee REAL NOT NULL DEFAULT 0,
    rules TEXT NOT NULL,
    prize_distribution TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    winners_data TEXT,
    platform_fee_collected REAL,
    country TEXT NOT NULL DEFAULT 'any',
    region TEXT NOT NULL DEFAULT 'any',
    gender_preference TEXT NOT NULL DEFAULT 'any',
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    placement INTEGER,
    prize_won REAL,
    entry_fee_paid REAL NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platform_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    object_path TEXT NOT NULL,
    photo_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'needs_review',
    photo_hash TEXT,
    uploaded_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    country TEXT,
    payout_details TEXT,
    created_at INTEGER NOT NULL,
    paid_at INTEGER,
    admin_note TEXT
  );

  CREATE TABLE IF NOT EXISTS email_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    channel TEXT NOT NULL,
    contact TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quest_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    game_name TEXT NOT NULL,
    help_type TEXT NOT NULL,
    playstyle TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_id TEXT NOT NULL,
    purchased_at INTEGER NOT NULL
  );
`;
