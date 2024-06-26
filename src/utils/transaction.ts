// Imports
import { Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { ifndef, isnull } from './general';
import { BalanceInsufficentError, CurrencyMismatchError, NoSuchWalletError, UserUnauthorisedError } from './errors';
import { canStartTransactionFor } from './permissions';

// Get database connection
const dbcon = new PrismaClient();

// Types
const WalletValidator = Prisma.validator<Prisma.WalletInclude>()({ Owner: true });

type Wallet = Prisma.WalletGetPayload<{
    include: typeof WalletValidator;
}> | null;

export { Wallet, WalletValidator };

async function getWallet(address: string) : Promise<Wallet> {
    return await dbcon.wallet.findUnique({where: { id: address }, include: WalletValidator});
}

// Public Methods
export async function beginTransaction(debtorAddress: string, creditorAddress: string, transaction_value: number, actorToken: string) : Promise<string> {
    // Step 1. Get our wallets
    const source_wallet = await dbcon.wallet.findUnique({where: { id: debtorAddress }});
    const destination_wallet = await dbcon.wallet.findUnique({where: { id: creditorAddress }});

    ifndef(source_wallet, () => { 
        console.log('No debtor!');
        throw new NoSuchWalletError(debtorAddress); 
    });
    ifndef(destination_wallet, () => { 
        console.log('No creditor!');
        throw new NoSuchWalletError(creditorAddress); 
    });

    // Step 2. Validate if the current user is allowed to make transactions with that wallet
    let authorised = canStartTransactionFor(actorToken, debtorAddress);

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