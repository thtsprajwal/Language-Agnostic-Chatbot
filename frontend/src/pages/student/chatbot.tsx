import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, HelpCircle, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import QuickActionButtons from "@/components/QuickActionButtons";
import ChatSidebar from "@/components/ChatSidebar";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/apiClient";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ConversationItem {
  _id: string;
  title: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const quickActions = [
  {
    label: "Check my attendance",
    icon: CheckCircle2,
    action: "What is my current attendance percentage?",
  },
  {
    label: "View today's schedule",
    icon: Calendar,
    action: "Show me my timetable for today",
  },
  {
    label: "Apply for certificate",
    icon: FileText,
    action: "I want to apply for a bonafide certificate",
  },
  {
    label: "Get help with fees",
    icon: HelpCircle,
    action: "Help me understand my fee structure",
  },
];

const StudentChatbot = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadConversations = async () => {
      try {
        const res = await apiCall("/api/student/conversations", { token });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 401) {
            navigate("/login", { replace: true });
            throw new Error("Session expired. Please log in again.");
          }
          throw new Error((body as { message?: string; error?: string }).message || (body as { message?: string; error?: string }).error || "Failed to fetch conversations");
        }

        const rawConversations = (await res.json()) as ConversationItem[];
        const formattedConversations = rawConversations.map((conv) => ({
          id: conv._id,
          title: conv.title,
        }));

        setConversations(formattedConversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    void loadConversations();
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!token) {
      console.error("Missing access token for chat request");
      return;
    }

    const currentConversationId = activeConversationId;

    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const res = await apiCall("/api/student/chat", {
        token,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          navigate("/login", { replace: true });
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error((body as { message?: string; error?: string; providerMessage?: string }).error || (body as { message?: string; error?: string; providerMessage?: string }).providerMessage || "Chat request failed");
      }

      const newConversationId = res.headers.get("x-conversation-id");
      const newConversationTitle = res.headers.get("x-conversation-title");

      if (!currentConversationId && newConversationId) {
        setActiveConversationId(newConversationId);
        setConversations((prev) => [
          {
            id: newConversationId,
            title: newConversationTitle || "New Chat",
          },
          ...prev,
        ]);
      } else if (currentConversationId) {
        setConversations((prev) => {
          const currentChat = prev.find((conv) => conv.id === currentConversationId);
          if (!currentChat) {
            return prev;
          }
          const filtered = prev.filter((conv) => conv.id !== currentConversationId);
          return [currentChat, ...filtered];
        });
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        streamedText += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: streamedText,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Error: Could not process your message. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  const handleSelectChat = async (id: string) => {
    if (!token) {
      console.error("Missing access token for conversation request");
      return;
    }

    setActiveConversationId(id);

    try {
      const res = await apiCall(`/api/student/conversations/${id}`, { token });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          navigate("/login", { replace: true });
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error((body as { message?: string; error?: string }).message || (body as { message?: string; error?: string }).error || "Failed to fetch conversation");
      }

      const data = (await res.json()) as ConversationMessage[];

      const formattedMessages = data.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border bg-card flex items-center px-6 sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/student")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <h1 className="ml-6 text-xl font-semibold text-foreground">College Assistant</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          onNewChat={handleNewChat}
          chatHistory={conversations}
          currentChatId={activeConversationId}
          onSelectChat={handleSelectChat}
        />

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="space-y-8 py-12 animate-fade-in">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                      <HelpCircle className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">Hi! I'm your College Assistant</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      I can help you with attendance, timetables, certificates, fees, and answer any questions about campus life.
                    </p>
                  </div>

                  <QuickActionButtons actions={quickActions} onSelect={handleSend} />
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatBubble key={index} {...message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          <ChatInput onSend={handleSend} placeholder="Ask anything." />
        </div>
      </div>
    </div>
  );
};

export default StudentChatbot;
