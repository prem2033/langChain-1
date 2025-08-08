import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
// Reference - https://langchain-ai.github.io/langgraphjs/tutorials/workflows/#agent
// Define tools
const multiply = tool(async ({ a, b }) => {
    return a * b;
}, {
    name: "multiply",
    description: "Multiply two numbers together",
    schema: z.object({
        a: z.number().describe("first number"),
        b: z.number().describe("second number"),
    }),
});
const add = tool(async ({ a, b }) => {
    return a + b;
}, {
    name: "add",
    description: "Add two numbers together",
    schema: z.object({
        a: z.number().describe("first number"),
        b: z.number().describe("second number"),
    }),
});
const divide = tool(async ({ a, b }) => {
    return a / b;
}, {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
        a: z.number().describe("first number"),
        b: z.number().describe("second number"),
    }),
});
// Augment the LLM with tools
const tools = [add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
// Initialize the LLM (Large Language Model) instance
const llm = new ChatOpenAI({
    // Add your configuration options here, e.g. apiKey, model, etc.
    apiKey: "-proj-SzcJNXjJAfdnxrn9pZP5UwJVlcNGqThiSSCH5R67OGbchktZDVfgqMQ5mBewUDLKlQA9v-TOOrT3BlbkFJ-wvcWzFO-cPZK_wLsUkFB6TtS42ZIg1zxdOjCnxmzbejCL2AkCazuF3tO_Br-hPG-PPte3j2AA",
    model: "gpt-4o",
});
const llmWithTools = llm.bindTools(tools); // not it has context of all tools
// creating nodes
// Nodes
async function llmCall(state) {
    // LLM decides whether to call a tool or not
    const result = await llmWithTools.invoke([
        {
            role: "system",
            content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
        },
        ...state.messages
    ]);
    return {
        messages: [result]
    };
}
// Conditional edge function to route to the tool node or end
function shouldContinue(state) {
    const messages = state.messages;
    const lastMessage = messages.at(-1);
    // If the LLM makes a tool call, then perform an action
    if (lastMessage?.tool_calls?.length) {
        return "Action";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
}
const toolNode = new ToolNode(tools);
// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
    .addNode("llmCall", llmCall)
    .addNode("tools", toolNode)
    // Add edges to connect nodes
    .addEdge("__start__", "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, {
    // Name returned by shouldContinue : Name of next node to visit
    "Action": "tools",
    "__end__": "__end__",
})
    .addEdge("tools", "llmCall")
    .compile();
// Invoke
const messages = [{
        role: "user",
        content: "Add 3 and 4."
    }];
const result = await agentBuilder.invoke({ messages });
console.log(result.messages);
//# sourceMappingURL=index.js.map