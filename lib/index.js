'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref) {
  var t = _ref.types;

  var IMPORT_NAME = 'handlebars-inline-precompile';
  var IMPORT_PROP = '_handlebarsImportSpecifier';

  function isReferenceToImport(node, file) {
    return t.isIdentifier(node, {
      name: file[IMPORT_PROP] && file[IMPORT_PROP].input
    });
  }

  // Precompile template and replace node.
  function compile(path, template, importName) {
    var precompiled = Handlebars.precompile(template);
    path.replaceWithSourceString(importName + '.template(' + precompiled + ')');
  }

  return {
    visitor: {

      /**
       * Find the import declaration for `hbs`.
       */

      ImportDeclaration: function ImportDeclaration(path, file) {
        var node = path.node,
            scope = path.scope;
        // Filter out anything other than the `hbs` module.

        if (!t.isLiteral(node.source, { value: IMPORT_NAME })) {
          return;
        }

        var first = node.specifiers && node.specifiers[0];

        // Throw an error if using anything other than the default import.
        if (!t.isImportDefaultSpecifier(first)) {
          var usedImportStatement = file.file.code.slice(node.start, node.end);
          throw path.buildCodeFrameError('Only `import hbs from \'' + IMPORT_NAME + '\'` is supported. You used: `' + usedImportStatement + '`');
        }

        var _file$addImport = file.addImport('handlebars/runtime', 'default', scope.generateUid('Handlebars')),
            name = _file$addImport.name;

        path.remove();

        // Store the import name to lookup references elsewhere.
        file[IMPORT_PROP] = {
          input: first.local.name,
          output: name
        };
      },


      /**
       * Look for places where `hbs` is called normally.
       */

      CallExpression: function CallExpression(path, file) {
        var node = path.node;

        // filter out anything other than `hbs`.

        if (!isReferenceToImport(node.callee, file)) {
          return;
        }

        var template = node.arguments.length > 0 && node.arguments[0].value;

        // if the template string is a valid filename, read in the template from there
        if (template.slice(-4) == '.hbs') {
          var templatePath = _path2.default.resolve(_path2.default.dirname(file.file.opts.filename), template);
          template = _fs2.default.readFileSync(templatePath).toString();
        }

        // `hbs` should be called as `hbs('template')`.
        if (node.arguments.length !== 1 || typeof template !== 'string') {
          throw path.buildCodeFrameError(node.callee.name + ' should be invoked with a single argument: the template string');
        }

        compile(path, template, file[IMPORT_PROP].output);
      },


      /**
       * Look for places where `hbs` is called as a tagged template.
       */

      TaggedTemplateExpression: function TaggedTemplateExpression(path, file) {
        var node = path.node;

        // filter out anything other than `hbs`.

        if (!isReferenceToImport(node.tag, file)) {
          return;
        }

        // hbs`${template}` is not supported.
        if (node.quasi.expressions.length) {
          throw path.buildCodeFrameError('placeholders inside a tagged template string are not supported');
        }

        var template = node.quasi.quasis.map(function (quasi) {
          return quasi.value.cooked;
        }).join('');

        compile(path, template, file[IMPORT_PROP].output);
      }
    }
  };
};

var _resolveCwd = require('resolve-cwd');

var _resolveCwd2 = _interopRequireDefault(_resolveCwd);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Use local handlebars (if installed as a peer) rather than the version that
// came with this plugin. Allows a newer handlebars to be used without needing
// to upgrade this package.
var Handlebars = require((0, _resolveCwd2.default)('handlebars') || 'handlebars');