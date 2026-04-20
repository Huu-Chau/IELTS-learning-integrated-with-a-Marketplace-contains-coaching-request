import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

class Vocabulary extends Model<InferAttributes<Vocabulary>, InferCreationAttributes<Vocabulary>> {
    declare id: CreationOptional<number>;
    declare userId: ForeignKey<User['id']>;
    declare word: string;
    declare englishMeaning: CreationOptional<string | null>;
    declare vietnameseMeaning: CreationOptional<string | null>;
    declare ipaSpelling: CreationOptional<string | null>;
    declare masteryLevel: CreationOptional<'New' | 'Learning' | 'Mastered'>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

Vocabulary.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
        },
        word: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        englishMeaning: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        vietnameseMeaning: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ipaSpelling: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        masteryLevel: {
            type: DataTypes.ENUM('New', 'Learning', 'Mastered'),
            defaultValue: 'New',
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    },
    {
        sequelize,
        modelName: 'Vocabulary',
        tableName: 'Vocabularies',
        timestamps: true,
    }
);

// Define Associations
User.hasMany(Vocabulary, { foreignKey: 'userId', as: 'vocabularies' });
Vocabulary.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Vocabulary;
