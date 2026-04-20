import MockMaterial from '../models/MockMaterial';

export interface IMockMaterialStorage {
    getById(id: string): Promise<MockMaterial | null>;
    getAllBySkill(skill: string): Promise<MockMaterial[]>;
    getByBookAndSkill(book: string, skill: string): Promise<MockMaterial[]>;
    save(material: Partial<MockMaterial>): Promise<MockMaterial>;
    delete(id: string): Promise<boolean>;
}
