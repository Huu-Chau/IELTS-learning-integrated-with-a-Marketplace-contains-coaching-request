/**
 * PostgresMockMaterialStorage
 *
 * Concrete implementation of IMockMaterialStorage using the MockMaterial
 * Sequelize model. This replaces the filesystem-based approach in
 * cambridgeTestRoutes.ts for mock test data.
 *
 * Design: Repository pattern (SOLID — Dependency Inversion)
 */
import MockMaterial from '../models/MockMaterial';
import { IMockMaterialStorage } from '../interfaces/IMockMaterialStorage';

export class PostgresMockMaterialStorage implements IMockMaterialStorage {

    /**
     * Fetch a specific mock material by its UUID.
     */
    async getById(id: string): Promise<MockMaterial | null> {
        console.log('[PostgresMockMaterialStorage] getById called', { id });
        try {
            const material = await MockMaterial.findByPk(id);
            console.log('[PostgresMockMaterialStorage] getById success', { found: !!material });
            return material;
        } catch (error) {
            console.error('[PostgresMockMaterialStorage] getById error', error);
            throw error;
        }
    }

    /**
     * Fetch all mock materials for a specific skill.
     */
    async getAllBySkill(skill: string): Promise<MockMaterial[]> {
        console.log('[PostgresMockMaterialStorage] getAllBySkill called', { skill });
        try {
            const materials = await MockMaterial.findAll({
                where: { skill: skill.toUpperCase() },
                order: [['book', 'ASC'], ['test_number', 'ASC']],
            });
            console.log('[PostgresMockMaterialStorage] getAllBySkill success', { count: materials.length });
            return materials;
        } catch (error) {
            console.error('[PostgresMockMaterialStorage] getAllBySkill error', error);
            throw error;
        }
    }

    /**
     * Fetch all tests for a given book + skill combination.
     * This replaces: fs.readFileSync(`cambridge_${book}_${skill}.json`)
     */
    async getByBookAndSkill(book: string, skill: string): Promise<MockMaterial[]> {
        console.log('[PostgresMockMaterialStorage] getByBookAndSkill called', { book, skill });
        try {
            // Translate "20" → "Cambridge 20" for the query
            const bookName = book.match(/^\d+$/) ? `Cambridge ${book}` : book;

            const materials = await MockMaterial.findAll({
                where: {
                    book: bookName,
                    skill: skill.toUpperCase(),
                },
                order: [['test_number', 'ASC']],
            });
            console.log('[PostgresMockMaterialStorage] getByBookAndSkill success', { count: materials.length });
            return materials;
        } catch (error) {
            console.error('[PostgresMockMaterialStorage] getByBookAndSkill error', error);
            throw error;
        }
    }

    /**
     * Save a new mock material to the database.
     */
    async save(material: Partial<MockMaterial>): Promise<MockMaterial> {
        console.log('[PostgresMockMaterialStorage] save called', {
            book: material.book,
            skill: material.skill,
            title: material.title,
        });
        try {
            const created = await MockMaterial.create(material as any);
            console.log('[PostgresMockMaterialStorage] save success', { id: created.id });
            return created;
        } catch (error) {
            console.error('[PostgresMockMaterialStorage] save error', error);
            throw error;
        }
    }

    /**
     * Delete a mock material by UUID.
     */
    async delete(id: string): Promise<boolean> {
        console.log('[PostgresMockMaterialStorage] delete called', { id });
        try {
            const deleted = await MockMaterial.destroy({ where: { id } });
            console.log('[PostgresMockMaterialStorage] delete success', { deleted: deleted > 0 });
            return deleted > 0;
        } catch (error) {
            console.error('[PostgresMockMaterialStorage] delete error', error);
            throw error;
        }
    }
}
