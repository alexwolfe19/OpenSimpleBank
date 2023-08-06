// Imports
import { Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { ifndef } from './general';
import { BalanceInsufficentError, CurrencyMismatchError, NoSuchWalletError, UserUnauthorisedError } from './errors';

// Get database connection
const dbcon = new PrismaClient();

// Types
const WalletValidator = Prisma.validator<Prisma.WalletInclude>()({
    Owners: true
});

type Wallet = Prisma.WalletGetPayload<{
    include: typeof WalletValidator;
}> | null;

export { Wallet, WalletValidator };

// Private Methods
async function validateUserMayBeginTransaction(userId: number, wallet: Wallet) : Promise<boolean> {
    let authorised = (wallet?.masterId == userId);
    if (!authorised) {
        wallet!.Owners.forEach(owner => {
            if (owner.accountId != userId) return;
            if (owner.mayAuthorNewTransactions) authorised = true;
        });
    }
    return authorised;
}

async function getWallet(address: string) : Promise<Wallet> {
    return await dbcon.wallet.findUnique({where: { id: address }, include: WalletValidator});
}

// Public Methods
export async function beginTransaction(debtorAddress: string, creditorAddress: string, issuingUserId: number, transaction_value: number) : Promise<string> {
    // Step 1. Get our wallets
    const source_wallet: Wallet = await getWallet(debtorAddress);
    const destination_wallet: Wallet = await getWallet(creditorAddress);

    ifndef(source_wallet, () => { throw new NoSuchWalletError(debtorAddress); });
    ifndef(destination_wallet, () => { throw new NoSuchWalletError(creditorAddress); });

    // Step 2. Validate if the current user is allowed to make transactions with that wallet
    const authorised = await validateUserMayBeginTransaction(issuingUserId, source_wallet);
    if (!authorised) throw new UserUnauthorisedError();

    if (source_wallet!.currencyId != destination_wallet?.currencyId) throw new CurrencyMismatchError();
    if (source_wallet!.balance < transaction_value) throw new BalanceInsufficentError();

    // Step 5. Execute the transaction
    const [transaction] = await dbcon.$transaction([
        dbcon.transaction.create({data:{
            debtorId: debtorAddress,
            creditorId: creditorAddress,
            value: transaction_value,
            status: TransactionStatus.PROCESSED,
            debtorHeadline: 'TRANSFER FROM USER',
            debtorDescription: 'Transfer baby :3'
        }}),
        dbcon.wallet.update({
            where: {id: debtorAddress},
            data: {balance:{decrement:transaction_value}}
        }),
        dbcon.wallet.update({
            where: {id: creditorAddress},
            data: {balance:{increment:transaction_value}}
        })
    ]);

    return transaction.id;
}