import Message from "../models/messages.model.js";

export const messagesController = async (req , res) => {
    try{
        const {conversationId}= req.query;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if(!conversationId){
            return res.status(400).json({message:"conversationId is required"});
        }
        const messages = await Message.find({conversationId, userId}).sort({createdAt:1});

        res.status(200).json(messages);

    }catch(error){
        res.status(500).json({message:"Error fetching messages",error:error.message});
    }
};
