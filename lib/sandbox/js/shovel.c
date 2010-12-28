#define XP_UNIX
#include <jsapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "shovel.h"

int main (int argc, const char *argv[]) {

	Sandbox *this = NULL;
	const char *utils_filepath;

	if (argc < 2) {
		SANDBOX_THROW_ERROR (this, "Required argument for utilities file.");
	} else {
		utils_filepath = argv[1];
	}

	this = sandbox_new();
	sandbox_initialize (this);
	sandbox_run (this, utils_filepath);
	sandbox_destroy (this);

	return 0;
}


Sandbox* sandbox_new ()
{
	Sandbox *this = malloc(sizeof(Sandbox));
	if (this == NULL) {
		SANDBOX_THROW_ERROR (NULL, "Could not allocate new sandbox.");
	}
	return this;
}


void sandbox_initialize (Sandbox *this)
{
	JS_SetCStringsAreUTF8();

	this->runtime = JS_NewRuntime (8L * 1024L * 1024L);
	if (this->runtime == NULL) {
		SANDBOX_THROW_ERROR (this, "Could not create runtime.");
	}
}


void sandbox_destroy (Sandbox *this)
{
	if (this != NULL) {
		if (this->utils_context.context != NULL) {
			JS_DestroyContext (this->utils_context.context);
		}
		if (this->runtime != NULL) {
			JS_DestroyRuntime(this->runtime);
		}
		JS_ShutDown();

		free (this);
	}
	this = NULL;
}


void sandbox_run (Sandbox *this, const char *filepath)
{
	jsval input;
	jsval returned;
	JSString *output;
	JSFunction *execute;

	sandbox_load_utils (this, filepath);

	execute = JS_NewFunction(this->utils_context.context,
				sandbox_jsnative_execute, 1, 0, NULL, NULL);
	if (execute == NULL) {
		SANDBOX_THROW_ERROR (this,
			"Out of memory while creating native execute function.");
	}

	input = OBJECT_TO_JSVAL(JS_GetFunctionObject (execute));

	if (!JS_CallFunctionName(this->utils_context.context,
				this->utils_exports, "run", 1, &input, &returned)) {
		SANDBOX_THROW_ERROR (this,
			"Could not call exports.run function in utilities file.");
	}
	
	output = JS_ValueToString (this->utils_context.context, returned);
	if (output == NULL) {
		SANDBOX_THROW_ERROR (this,
			"Error converting exports.run return value to a string.");
	}

	fprintf (stdout, "%s\n", JS_EncodeString (this->utils_context.context, output));
	fflush (stdout);
}


void sandbox_load_utils (Sandbox *this, const char *filepath)
{
	jsval retval;
	JSContext *context;
	JSObject *global;
	FILE *utils_stream;
	char *utils_input;
	int utils_size;

	JSObject *exports;
	JSObject *global_object;

	this->utils_context = sandbox_context_create (this);

	utils_stream = fopen (filepath, "r");
	if (utils_stream == NULL) {
		SANDBOX_THROW_ERROR (this, "Could not open utilities file.");
	}

	utils_input = sandbox_read_into (this, utils_stream, 1024, &utils_size);

	context = this->utils_context.context;
	global = this->utils_context.global;
	exports = JS_NewObject (context, NULL, NULL, global);

	if (!JS_DefineProperty(context, global, "exports", OBJECT_TO_JSVAL (exports),
                       JS_PropertyStub, JS_PropertyStub, JSPROP_PERMANENT)) {
		SANDBOX_THROW_ERROR (this, "Could not make new exports global.");
	}

	global_object = sandbox_globals_create (this, context);
	
	if (!JS_InitStandardClasses (context, global_object)) {
		SANDBOX_THROW_ERROR (this,
			"Could not populate global object with standard globals.");
	}

	if (!JS_DefineProperty(context, global, "GlobalObject", OBJECT_TO_JSVAL (global_object),
                       JS_PropertyStub, JS_PropertyStub, JSPROP_PERMANENT)) {
		SANDBOX_THROW_ERROR (this, "Could not make global object.");
	}

	if (!JS_EvaluateScript (context, global, utils_input, utils_size-1,
	                        "irc", 1, &retval)) {
		SANDBOX_THROW_ERROR (this, "Could not execute utilities file.");
	}

	this->utils_exports = exports;
}


char *sandbox_read_into (Sandbox *this, FILE *src, unsigned int buffersize, int *length)
{
	char *tmp;
	char *desc;
	char buffer[buffersize];

	desc = malloc(buffersize);
	if (desc == NULL) { goto error; }

	*desc = 0;
	*length = 1;

	while (fgets (buffer, buffersize, src) != NULL) {
		*length += strlen (buffer);
		tmp = realloc (desc, *length);
		if (tmp == NULL) { goto error; }

		strcat (desc = tmp, buffer);
	}

	if (ferror (src)) { goto error; }

	return desc;

	error:
		free (desc);
		if (this != NULL) {
			SANDBOX_THROW_ERROR (this,
				"Error reading source or allocating buffer to store the script.");
		}
		return NULL;
}


SandboxError sandbox_throw_error (Sandbox *this, const char  *message,
                                  const char *function, unsigned int line)
{
	static const char* format = "{"
		"\"data\": {},"
		"\"error\": \"RuntimeError: %s: line %d, %s\","
		"\"result\": \"undefined\" }\n";

	fprintf (stdout, format, function, line, message);
	fflush (stdout);
	sandbox_destroy (this);
	exit (1);
}


SandboxContext sandbox_context_create (Sandbox *this)
{
	JSContext *context;
	SandboxContext sc;

	context = JS_NewContext (this->runtime, 8192);
	if (context == NULL) {
		SANDBOX_THROW_ERROR (this, "Could not create new context.");
	}

	JS_SetOptions (context,
		JSOPTION_VAROBJFIX | JSOPTION_JIT | JSOPTION_METHODJIT | JSOPTION_DONT_REPORT_UNCAUGHT);
	JS_SetVersion (context, JSVERSION_LATEST);

	sc.context = context;
	sc.global = sandbox_globals_create (this, context);
	return sc;
}


JSObject* sandbox_globals_create (Sandbox *this, JSContext *context)
{
	JSObject *global;
	
	static JSClass global_class = {
		"global", JSCLASS_GLOBAL_FLAGS,
		JS_PropertyStub, JS_PropertyStub, JS_PropertyStub, JS_PropertyStub,
		JS_EnumerateStub, JS_ResolveStub, JS_ConvertStub, JS_FinalizeStub,
		JSCLASS_NO_OPTIONAL_MEMBERS
	};
	
	global = JS_NewGlobalObject (context, &global_class);
	if (global == NULL) {
		SANDBOX_THROW_ERROR (this, "Could not create global object.");
	}

	if (!JS_InitStandardClasses (context, global)) {
		SANDBOX_THROW_ERROR (this,
			"Could not populate global object with standard globals.");
	}
	
	return global;
}


JSBool sandbox_jsnative_execute(JSContext *cx, uintN argc, jsval *vp)
{
	JSObject *global_object;
	static char *input_text = NULL;
	static unsigned int input_size;
	
	jsval *argv = JS_ARGV(cx, vp);
	jsval return_value = JSVAL_VOID;

	JSBool success = JS_FALSE;

	if (!JS_ValueToObject(cx, argv[0], &global_object)) {
		JS_THROW_SANDBOX_ERROR (cx, "Expected argument to be object.");
		goto cleanup;
	}

	if (global_object == NULL) {
		JS_THROW_SANDBOX_ERROR (cx, "Expected argument to be object.");
		goto cleanup;
	}

	if (input_text == NULL) {
		input_text = sandbox_read_into (NULL, stdin, 512, &input_size);
	}
	
	if (input_text == NULL) {
		JS_THROW_SANDBOX_ERROR (cx, "Could not read input script.");
		goto cleanup;
	}

	if (!JS_EvaluateScript (cx,
	                   global_object, input_text, input_size-1,
	                   "irc", 1, &return_value)) {
		goto cleanup;
	}

	success = JS_TRUE;

	cleanup:
		JS_SET_RVAL(cx, vp, return_value);
		free (input_text);
		return success;
}

