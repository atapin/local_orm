const uuid = require('node-uuid');
const _    = require('underscore');

const TYPE_PREFIX = "RELATIVE_STORE";

const types = {
  string: "#{TYPE_PREFIX}_STRING",
  integer: "#{TYPE_PREFIX}_INTEGER",
  boolean: "#{TYPE_PREFIX}_BOOLEAN"
}

let validations = {};

function define({name: name, schema: schema}) {
  let table_key = (name) => "#{name}_#{name}";

  const loadTable = (table_name) => {
    let s = window.localStorage[table_key(table_name)];
    return s ? JSON.parse(s) : [];
  }

  const commitTable = (table_name, entities) => {
    return window.localStorage[table_key(table_name)] = JSON.stringify(entities);
  }

  let out = {};
  let entity_types = Object.keys(schema);
  entity_types.forEach((name) => {
    const config = schema[name];
    const fields = Object.keys(config);

    const all = () => loadTable(name);

    const setDefaultValues = (entity) => {
      fields.forEach( (k) => {
        if (!entity[k] && !_.isUndefined(config[k].defaultVal)) {
          entity[k] = config[k].defaultVal;
        };
      });
      return entity;
    }

    const isValid = (ent) => {
      return [null, true];
    }

    const create = (ent) => {
      ent.id = uuid.v1();
      [err, valid] = isValid(ent);
      if (valid) {
        let entities = all();
        entities.push(ent);
        commitTable(name, entities);
        return [null, ent];
      } else {
        return [err, null]
      }
    };

    const update = (ent) => {
      [err, valid] = isValid(ent);
      if (valid) {
        let entities = all();
        const ind = _.findIndex(entities, { id: ent.id });
        if (ind > -1) {
          entities[ind] = ent;
          commitTable(name, entities);
          return [null, ent];
        } else {
          throw "Not Found";
          return ['Not Found', null];
        }
      } else {
        return [err, null];
      }
    };

    const save = (oldEnt) => {
      let ent = setDefaultValues(oldEnt);
      if (ent.id) {
        return update(ent);
      } else {
        return create(ent);
      }
    };

    const find = (id) => {
      const ent = _.find(all(), {id: id});
      if (ent) {
        return [null, ent];
      } else {
        return ["Not Found", null];
      }
    };

    const destroy = (id) => {
      [err, ent] = find(id)
      if (err) {
        return [err, false];
      } else {
        let entities = all();
        let e = _.find(entities, { id: ent.id });
        let updatedEntities = _.without(entities, e);
        commitTable(name, updatedEntities);
        return [null, true];
      }
    };

    const where = (filters) => {
      let entities = loadTable(name);
      return _.filter(entities, filters);
    };

    out[name] = { save, find, destroy, all, where };
  });
  return out;

}

module.exports = {
  validations: validations,
  define: define,
  types: types
};