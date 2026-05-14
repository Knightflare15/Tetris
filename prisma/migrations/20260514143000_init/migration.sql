BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [displayName] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [lastLoginAt] DATETIME2,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FriendRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [senderId] NVARCHAR(1000) NOT NULL,
    [receiverId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [FriendRequest_status_df] DEFAULT 'pending',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FriendRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [respondedAt] DATETIME2,
    CONSTRAINT [FriendRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FriendRequest_senderId_receiverId_key] UNIQUE NONCLUSTERED ([senderId],[receiverId])
);

-- CreateTable
CREATE TABLE [dbo].[Friendship] (
    [id] NVARCHAR(1000) NOT NULL,
    [userAId] NVARCHAR(1000) NOT NULL,
    [userBId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Friendship_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Friendship_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Friendship_userAId_userBId_key] UNIQUE NONCLUSTERED ([userAId],[userBId])
);

-- CreateTable
CREATE TABLE [dbo].[Match] (
    [id] NVARCHAR(1000) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [score] INT NOT NULL CONSTRAINT [Match_score_df] DEFAULT 0,
    [level] INT NOT NULL CONSTRAINT [Match_level_df] DEFAULT 1,
    [lines] INT NOT NULL CONSTRAINT [Match_lines_df] DEFAULT 0,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [Match_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [endedAt] DATETIME2,
    CONSTRAINT [Match_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Match_roomId_key] UNIQUE NONCLUSTERED ([roomId])
);

-- CreateTable
CREATE TABLE [dbo].[MatchPlayer] (
    [id] NVARCHAR(1000) NOT NULL,
    [slot] NVARCHAR(1000) NOT NULL,
    [disconnectedCount] INT NOT NULL CONSTRAINT [MatchPlayer_disconnectedCount_df] DEFAULT 0,
    [finalScore] INT NOT NULL CONSTRAINT [MatchPlayer_finalScore_df] DEFAULT 0,
    [finalLevel] INT NOT NULL CONSTRAINT [MatchPlayer_finalLevel_df] DEFAULT 1,
    [finalLines] INT NOT NULL CONSTRAINT [MatchPlayer_finalLines_df] DEFAULT 0,
    [userId] NVARCHAR(1000) NOT NULL,
    [matchId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [MatchPlayer_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MatchPlayer_matchId_userId_key] UNIQUE NONCLUSTERED ([matchId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[LeaderboardScore] (
    [id] NVARCHAR(1000) NOT NULL,
    [score] INT NOT NULL,
    [level] INT NOT NULL,
    [lines] INT NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LeaderboardScore_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] NVARCHAR(1000) NOT NULL,
    [matchId] NVARCHAR(1000),
    CONSTRAINT [LeaderboardScore_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecentTeammate] (
    [id] NVARCHAR(1000) NOT NULL,
    [matchCount] INT NOT NULL CONSTRAINT [RecentTeammate_matchCount_df] DEFAULT 1,
    [lastPlayedAt] DATETIME2 NOT NULL CONSTRAINT [RecentTeammate_lastPlayedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] NVARCHAR(1000) NOT NULL,
    [teammateId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [RecentTeammate_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RecentTeammate_userId_teammateId_key] UNIQUE NONCLUSTERED ([userId],[teammateId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_idx] ON [dbo].[RefreshToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FriendRequest_receiverId_status_idx] ON [dbo].[FriendRequest]([receiverId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Friendship_userBId_idx] ON [dbo].[Friendship]([userBId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MatchPlayer_userId_idx] ON [dbo].[MatchPlayer]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderboardScore_mode_score_idx] ON [dbo].[LeaderboardScore]([mode], [score]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LeaderboardScore_userId_idx] ON [dbo].[LeaderboardScore]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecentTeammate_teammateId_idx] ON [dbo].[RecentTeammate]([teammateId]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FriendRequest] ADD CONSTRAINT [FriendRequest_senderId_fkey] FOREIGN KEY ([senderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FriendRequest] ADD CONSTRAINT [FriendRequest_receiverId_fkey] FOREIGN KEY ([receiverId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Friendship] ADD CONSTRAINT [Friendship_userAId_fkey] FOREIGN KEY ([userAId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Friendship] ADD CONSTRAINT [Friendship_userBId_fkey] FOREIGN KEY ([userBId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchPlayer] ADD CONSTRAINT [MatchPlayer_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MatchPlayer] ADD CONSTRAINT [MatchPlayer_matchId_fkey] FOREIGN KEY ([matchId]) REFERENCES [dbo].[Match]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderboardScore] ADD CONSTRAINT [LeaderboardScore_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LeaderboardScore] ADD CONSTRAINT [LeaderboardScore_matchId_fkey] FOREIGN KEY ([matchId]) REFERENCES [dbo].[Match]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecentTeammate] ADD CONSTRAINT [RecentTeammate_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecentTeammate] ADD CONSTRAINT [RecentTeammate_teammateId_fkey] FOREIGN KEY ([teammateId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
