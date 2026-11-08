import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import connectToDatabase from "../database/mongodb.js";
import conversationRouter from "../routes/conversation.js";


export const getAllConversations = async(req,res) =>{
    try{
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const conversations = await Conversation.find({ userId }).sort({createdAt : -1}).limit(10);
        res.status(200).json(conversations);
    }catch(error){
        res.status(500).json({message:"Error fetching conversations",error:error.message});
    }
}