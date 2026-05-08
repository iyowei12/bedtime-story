import { bus } from '../core/bus';
import { generateStory } from './llm';

class StoryService {
  constructor() {
    bus.on('story:request_generate', async ({ imgs, len, cfg, lang }) => {
      try {
        const text = await generateStory({ imgs, len, cfg, lang });
        bus.emit('story:ready', { text });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        bus.emit('app:error', { message, source: 'Story Generator' });
      }
    });
  }
}

export const storyService = new StoryService();
