/**
 * @module Spectrum
 */ /** */

import { User } from '../interfaces/user.interface';
import { Service as RSI } from './../../RSI/services/rsi.service';
import { Broadcaster } from '../services/broadcaster.service';
import { SpectrumLobby } from './lobby.component';
import { receivedTextMessage } from '../interfaces/receivedTextMessage.interface';

/**
 * @class SpectrumUser
 */
export class SpectrumUser {
    protected _user:User;
    private rsi: RSI = RSI.getInstance();
    private broadcaster:Broadcaster = Broadcaster.getInstance();
    protected privateLobby:SpectrumLobby;
    private _pmListener:number;
    private _messageListener:number;

    /**
     * @param user the user info as returned by RSI
     */
    constructor(user:User) {
        this._user = user;
    }

    /**
     * Public getter for user
     * @return the raw user info
     */
    public getUser():User {
        return this._user;
    }

    /**
     * Creates a private lobby for private messaging with the given user
     * @return The private lobby
     */
    public getPrivateLobbyWithUser():Promise<SpectrumLobby> {
        if(this.privateLobby) return Promise.resolve(this.privateLobby);

        return this.rsi.post("api/spectrum/lobby/info",{member_id: this._user.id}).then( (data) => {
            let payload = data.data;

            this.privateLobby = new SpectrumLobby(payload);
            return this.privateLobby;
        });
    }

    /**
     * Sends plain text message to this user
     */
    public sendPrivateMessage(text:string) {
        let sendPM = (text) => {
            return this.privateLobby.sendPlainTextMessage(text);
        } 

        if(!this.privateLobby) return this.getPrivateLobbyWithUser().then(() => sendPM(text));
        return sendPM(text);
    }

    /**
     * Declare a custom callback on private message from this user
     * @todo have more than one callback
     * @param callback
     */
    public onPrivateMessage(callback=(message:receivedTextMessage)=>{}) {
        this.closeOnPrivateMessage();
        this.privateLobby.OnTextMessage(callback);
    }

    /**
     * Declare a custom callback on any message from this user
     * @todo have more than one callback
     * @param callback
     */
    public onMessage(callback=(message:receivedTextMessage)=>{}) {        
        this.closeOnMessage();
        this._pmListener = this.broadcaster.addListener("message.new", m => callback(m.message), {
            message: {
                member: {id:this._user.id}
            }
        });
    }

    /**
     * Stop sending messages to the callback for All messages.
     */
    public closeOnMessage() {
        this.broadcaster.removeListener(this._messageListener);
    }
    
    /**
     * Stop sending messages to the callback for private messages.
     */
    public closeOnPrivateMessage() {
        this.broadcaster.removeListener(this._pmListener);
    }

    /**
     * Generate a mention for this user to be used for sending a message to a lobby/forum
     * @see TextMessage.sendPlainTextMessage()
     * @throws error on nickname or id not exist
     * @return a mention rich-text to be parsed by sendPlainTextMessage
     */
    public mention():string {
        if(this._user && this._user.nickname && this._user.id)
            return "<scAPIM>@"+this._user.nickname+":"+this._user.id+"</scAPIM>";
        else throw new Error("User does not have a nickname/id");
    }
}