/**
 * Extract and parse JSON from AI responses
 * Handles cases where AI includes markdown code blocks or extra text
 */
export function parseAIJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                     text.match(/```\s*([\s\S]*?)\s*```/) ||
                     text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e2) {
        throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 200)}...`);
      }
    }
    
    throw new Error(`No JSON found in AI response: ${text.substring(0, 200)}...`);
  }
}
