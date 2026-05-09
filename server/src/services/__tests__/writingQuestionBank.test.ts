import { getRandomPart1Task, getRandomPart2Task } from '../writingQuestionBank';

describe('WritingQuestionBank', () => {
  describe('getRandomPart1Task', () => {
    it('should return a valid Part 1 task', () => {
      const task = getRandomPart1Task();
      expect(task).toBeDefined();
      expect(task.part).toBe('part1');
      expect(task.taskType).toBeDefined();
      expect(task.prompt).toBeDefined();
      expect(task.dataDescription).toBeDefined();
    });

    it('should return different tasks (eventually) due to randomness', () => {
      // Mock Math.random to return first element
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0);
      const task1 = getRandomPart1Task();
      
      // Mock Math.random to return second element
      mockRandom.mockReturnValue(0.26); // 0.26 * 4 = 1.04 -> index 1
      const task2 = getRandomPart1Task();
      
      expect(task1.prompt).not.toBe(task2.prompt);
      
      mockRandom.mockRestore();
    });
  });

  describe('getRandomPart2Task', () => {
    it('should return a valid Part 2 task', () => {
      const task = getRandomPart2Task();
      expect(task).toBeDefined();
      expect(task.part).toBe('part2');
      expect(task.taskType).toBeDefined();
      expect(task.prompt).toBeDefined();
    });

    it('should return different tasks (eventually) due to randomness', () => {
      // Mock Math.random to return first element
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0);
      const task1 = getRandomPart2Task();
      
      // Mock Math.random to return last element
      mockRandom.mockReturnValue(0.99); 
      const task2 = getRandomPart2Task();
      
      expect(task1.prompt).not.toBe(task2.prompt);
      
      mockRandom.mockRestore();
    });
  });
});
