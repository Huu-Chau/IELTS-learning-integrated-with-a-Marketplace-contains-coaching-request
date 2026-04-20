import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Message model - a single chat message in a conversation between a student and a teacher.
 * conversationId is a stable key: sorted Firebase UIDs joined with "_" (e.g. "uidA_uidB").
 */
class Message extends Model<
    InferAttributes<Message>,
    InferCreationAttributes<Message>
> {
    declare id: CreationOptional<number>;
    declare conversationId: string; // "<studentId>_<teacherId>" sorted alphabetically
    declare senderId: string;       // Firebase UID of the sender
    declare receiverId: string;     // Firebase UID of the receiver
    declare content: string;        // text message or special payload like "meet:https://..."
    declare type: CreationOptional<'text' | 'meeting_link'>; // message type
    declare isRead: CreationOptional<boolean>;
    declare sentAt: CreationOptional<Date>;
}

Message.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        conversationId: {
            type: DataTypes.STRING(260),
            allowNull: false,
        },
        senderId: {
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        receiverId: {
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'text',
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        sentAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: 'Message',
        tableName: 'Messages',
        timestamps: false, // use custom sentAt field
    }
);

export default Message;
