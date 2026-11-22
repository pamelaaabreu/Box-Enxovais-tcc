const eslint=require('@eslint/js');
const tseslint=require('typescript-eslint');
const angular=require('angular-eslint');
module.exports=tseslint.config(
 {ignores:['dist/**','node_modules/**','.angular/**']},
 {files:['src/**/*.ts'],extends:[eslint.configs.recommended,...tseslint.configs.recommended,...angular.configs.tsRecommended],processor:angular.processInlineTemplates,rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_',ignoreRestSiblings:true}]}},
 {files:['src/**/*.html'],extends:[...angular.configs.templateRecommended,...angular.configs.templateAccessibility],rules:{'@angular-eslint/template/label-has-associated-control':['error',{controlComponents:['mat-select','mat-button-toggle-group']}]}},
);
