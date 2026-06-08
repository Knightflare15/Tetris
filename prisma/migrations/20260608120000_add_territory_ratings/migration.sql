BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[TerritoryRating] (
    [id] NVARCHAR(1000) NOT NULL,
    [rating] INT NOT NULL CONSTRAINT [TerritoryRating_rating_df] DEFAULT 1200,
    [gamesPlayed] INT NOT NULL CONSTRAINT [TerritoryRating_gamesPlayed_df] DEFAULT 0,
    [wins] INT NOT NULL CONSTRAINT [TerritoryRating_wins_df] DEFAULT 0,
    [losses] INT NOT NULL CONSTRAINT [TerritoryRating_losses_df] DEFAULT 0,
    [draws] INT NOT NULL CONSTRAINT [TerritoryRating_draws_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TerritoryRating_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [TerritoryRating_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TerritoryRating_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- Backfill existing account users with the default rating.
INSERT INTO [dbo].[TerritoryRating] ([id], [rating], [gamesPlayed], [wins], [losses], [draws], [createdAt], [updatedAt], [userId])
SELECT NEWID(), 1200, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, [id]
FROM [dbo].[User]
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[TerritoryRating]
    WHERE [dbo].[TerritoryRating].[userId] = [dbo].[User].[id]
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TerritoryRating_rating_idx] ON [dbo].[TerritoryRating]([rating]);

-- AddForeignKey
ALTER TABLE [dbo].[TerritoryRating] ADD CONSTRAINT [TerritoryRating_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
