import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/messages.model.js";

export const getOneConversation = async(req,res) => {
    try{
        const {id} = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const messages = await Message.find({conversationId : id, userId});
        if(!messages || messages.length === 0){
            return res.status(404).json({message:"Conversation not found"});
        }
        res.status(200).json(messages);
    }catch(error){
        res.status(500).json({message:"Error fetching conversation",error:error.message});
    }
}