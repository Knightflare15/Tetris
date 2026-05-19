BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ALTER COLUMN [passwordHash] NVARCHAR(1000) NULL;

-- CreateTable
CREATE TABLE [dbo].[OidcAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [emailVerified] BIT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OidcAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [lastLoginAt] DATETIME2,
    [userId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [OidcAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [OidcAccount_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OidcAccount_userId_idx] ON [dbo].[OidcAccount]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[OidcAccount] ADD CONSTRAINT [OidcAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
