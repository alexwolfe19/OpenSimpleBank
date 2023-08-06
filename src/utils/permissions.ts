export async function doesUserHavePermission() {
    
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserLogin(userid: number) : Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserCreateAccountFor(application: string, userid: number) : Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenCreateAccountFor(application: string, identity: string) : Promise<boolean> {
    return true;
}

export type UserInfoAccess = {
    username : boolean,
    createdOn : boolean,
    email : boolean,
    defaultApplicationId : boolean,
    tokenList : boolean,
    sessionList : boolean,
    membershipList : boolean
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function viewUserGrantsToUserInfo(actorid: number, targetUsername: string) : Promise<UserInfoAccess> {

    return {
        username: true,
        createdOn: true,
        email: true,
        defaultApplicationId: true,
        tokenList: true,
        sessionList: true,
        membershipList: true
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function viewTokenGrantsToUserInfo(identity: string, username: string) : Promise<UserInfoAccess> {
    
    return {
        username: true,
        createdOn: true,
        email: true,
        defaultApplicationId: true,
        tokenList: true,
        sessionList: true,
        membershipList: true
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserCreateCurrencyFor(userid: number, applicationid: string) : Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenCreateCurrencyFor(identity: string, applicationid: string) : Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserBeginTransactionFor(userid: number, walletid: string) : Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenBeginTransactionFor(identity: string, walletid: string) : Promise<boolean> {
    return true;
}