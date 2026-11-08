import Conversation from "../models/conversation.model.js";
import Message from "../models/messages.model.js";
import { v4 as uuidv4 } from "uuid";

export const chatController = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let activeConversationId = conversationId;
    let isNewConversation = false;

    if (!activeConversationId) {
      const newConversation = await Conversation.create({
        title: message.slice(0, 30),
        userId,
      });

      activeConversationId = newConversation._id.toString();
      isNewConversation = true;
    } else {
      const existingConversation = await Conversation.findOne({
        _id: activeConversationId,
        userId,
      }).lean();

      if (!existingConversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    }

    await Message.create({
      conversationId: activeConversationId,
      userId,
      role: "user",
      content: message,
      messageid: uuidv4(),
    });

    const previousMessages = await Message.find({
      conversationId: activeConversationId,
      userId,
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    const formattedMessages = [
      {
        role: "system",
        content: `You are a helpful college assistant chatbot.

Help students with:
- attendance
- fees
- certificates
- campus queries`,
      },
      ...previousMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }

    const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: formattedMessages,
          stream: true,
          temperature: 0,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("GROQ API Error Response:", errorText);

      let providerMessage = "Unable to process request from LLM provider";
      try {
        const parsed = JSON.parse(errorText);
        providerMessage = parsed?.error?.message || providerMessage;
      } catch {
        providerMessage = errorText || providerMessage;
      }

      if (groqResponse.status === 404) {
        return res.status(502).json({
          error: `Configured GROQ model "${groqModel}" is unavailable for this API key. Set GROQ_MODEL to a model your account can access.`,
          providerMessage,
        });
      }

      return res.status(502).json({
        error: `GROQ API request failed with status ${groqResponse.status}`,
        providerMessage,
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("x-conversation-id", activeConversationId);

    if (isNewConversation) {
      res.setHeader("x-conversation-title", message.slice(0, 30));
    }

    const reader = groqResponse.body?.getReader();
    if (!reader) {
      throw new Error("Missing response stream from GROQ");
    }

    const decoder = new TextDecoder();
    let fullReply = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const text = parsed?.choices?.[0]?.delta?.content;

          if (text) {
            fullReply += text;
            res.write(text);
          }
        } catch (error) {
          console.error("Stream Parse Error:", error);
        }
      }
    }

    await Message.create({
      conversationId: activeConversationId,
      userId,
      role: "assistant",
      content: fullReply,
      messageid: uuidv4(),
    });

    await Conversation.findByIdAndUpdate(activeConversationId, {
      updatedAt: new Date(),
    });

    return res.end();
  } catch (error) {
    console.error("Chat controller error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
    return res.end();
  }
};
