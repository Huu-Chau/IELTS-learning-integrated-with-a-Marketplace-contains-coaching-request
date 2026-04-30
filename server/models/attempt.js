'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Attempt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Attempt.init({
    userId: DataTypes.INTEGER,
    testId: DataTypes.STRING,
    type: DataTypes.STRING,
    score: DataTypes.FLOAT,
    feedback: DataTypes.TEXT,
    answers: DataTypes.JSONB,
    recordingPath: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Attempt',
  });
  return Attempt;
};