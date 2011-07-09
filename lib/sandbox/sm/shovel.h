#ifndef SHOVEL_H
#define SHOVEL_H

#define SANDBOX_THROW_ERROR_JS(sandbox, context) \
	{ \
		jsval exc; \
		JSString *excstr; \
		if (JS_GetPendingException (context, &exc)) { \
			JS_ClearPendingException (context); \
			excstr = JS_ValueToString (context, exc); \
			if (excstr == NULL) { \
				sandbox_throw_error (sandbox, "Second exception thrown when converting first exception into a string."); \
			} \
			sandbox_throw_error (sandbox, JS_EncodeString (context, excstr)); \
		} \
	}

#define JS_THROW_SANDBOX_ERROR(cx, message) \
	JS_ReportError(cx, "SandboxError: %s (in %s on line %d)", message, __FUNCTION__, __LINE__)

#define L printf("line: %d\n", __LINE__);

typedef struct {
	JSContext  *context;
	JSObject   *global;
} SandboxContext;

typedef struct {
	JSRuntime  *runtime;
	SandboxContext utils_context;
	JSObject    *utils_exports;
} Sandbox;

typedef char* SandboxError;

/* Sandbox */
Sandbox *        sandbox_new             ();

void             sandbox_initialize      (Sandbox     *this);

void             sandbox_destroy         (Sandbox     *this);

void             sandbox_run             (Sandbox     *this,
                                          const char  *filepath);

char *           sandbox_read_into       (Sandbox     *this,
                                          FILE        *src,
                                          unsigned int buffersize,
                                          int         *length);

void             sandbox_load_utils      (Sandbox *this,
                                          const char *filepath);

SandboxError     sandbox_throw_error     (Sandbox     *this,
                                          const char  *message);

/* SandboxContext */
SandboxContext   sandbox_context_create   (Sandbox     *this);

JSObject*        sandbox_globals_create   (Sandbox     *this,
                                           JSContext   *context);

JSBool           sandbox_jsnative_execute (JSContext *context,
                                           uintN argc,
                                           jsval *vp);

#endif
