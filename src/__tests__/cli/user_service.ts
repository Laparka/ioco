import {Logger} from "./testStartup";

export type UserModel = {
    userName: string;
    password: string;
};

export type UserService = {
    add(user: UserModel): string;

    edit(userId: string, user: UserModel): boolean;

    delete(userId: string): boolean;
}

export class InMemoryUserService implements UserService {
    private readonly  _logger: Logger;
    private readonly _users: Map<string, UserModel>;
    constructor(logger: Logger) {
        this._logger = logger;
        this._users = new Map<string, UserModel>();
    }

    add(user: UserModel): string {
        if (!user.userName) {
            this._logger.log("Username is missing", "ERROR");
            throw Error('Username is missing');
        }

        if (!user.password) {
            this._logger.log("User password is missing", "ERROR");
            throw Error('User password is missing');
        }

        const userId = Date.now().toString();
        this._users.set(userId, user);
        this._logger.log(`UserID added: ${userId}`, "DEBUG");
        return userId;
    }

    delete(userId: string): boolean {
        if (!userId) {
            throw Error('userId is required');
        }

        return this._users.delete(userId);
    }

    edit(userId: string, user: UserModel): boolean {
        if (!userId) {
            throw Error('userId is required');
        }

        if (!user.userName) {
            this._logger.log("Username is missing", "ERROR");
            throw Error('Username is missing');
        }

        if (!user.password) {
            this._logger.log("User password is missing", "ERROR");
            throw Error('User password is missing');
        }

        if (!this._users.has(userId)) {
            throw Error(`The user record was not found: '${userId}'`);
        }

        this._users.set(userId, user);
        return true;
    }
}