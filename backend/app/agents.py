from langchain.agents import create_agent
import os
from dotenv import load_dotenv

load_dotenv()

openrouter_model = os.getenv("OPENROUTER_MODEL")


def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"


agent = create_agent(
    model=f"openrouter:{openrouter_model}",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)


result = agent.invoke(
    {"messages": [{"role": "user", "content": "What's the weather in San Francisco?"}]}
)

print(result["messages"][-1].content_blocks)
