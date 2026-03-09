interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class AIService {
  private skills: Record<string, unknown>[] = [];

  async loadSkills(): Promise<void> {
    try {
      const basePath =
        process.env.NODE_ENV === "production"
          ? `/${process.env.NEXT_PUBLIC_REPO_NAME || "easyprint"}`
          : "";
      const res = await fetch(`${basePath}/skills.json`);
      if (res.ok) {
        this.skills = await res.json();
      }
    } catch {
      console.warn("Could not load AI skills");
    }
  }

  async chat(
    messages: ChatMessage[],
    endpoint: string,
    model: string
  ): Promise<AIResponse> {
    if (this.skills.length === 0) {
      await this.loadSkills();
    }

    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an AI assistant for EasyPrint, a web-based 3D modeling application similar to Autodesk Fusion 360.
You can help users create 3D models by using the available tools.
Available tools: ${JSON.stringify(this.skills)}`,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gpt-4",
        messages: [systemMessage, ...messages],
        tools: this.skills.length > 0 ? this.skills : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    const toolCalls: ToolCall[] = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolCalls.push({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || "{}"),
        });
      }
    }

    return {
      content: choice?.message?.content || "",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
