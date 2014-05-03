#include <v8.h>
#include <stdlib.h>
#include <iostream>
#include <fstream>
#include <istream>
#include <iterator>

#define V8Str(x) v8::String::NewFromUtf8(isolate, x)

void sandbox_throw_error (const char  *message)  __attribute__ ((noreturn));
v8::Handle<v8::Context> sandboxContext(v8::Isolate* isolate);
v8::Local<v8::Value> v8_load_run_file(const char* filename, v8::Handle<v8::Context> context);
int main(int argc, char* argv[]) {
    const char *utils_filepath;

    if (argc < 2) {
        sandbox_throw_error("Required argument for utilities file.");
    } else {
        utils_filepath = argv[1];
    }

    v8::V8::SetFlagsFromString("--harmony", 9);
    // Get the default Isolate created at startup.
    v8::Isolate* isolate = v8::Isolate::GetCurrent();

    // Create a stack-allocated handle scope.
    v8::HandleScope handle_scope(isolate);

    // Create a new context.
    v8::Handle<v8::Context> context = sandboxContext(isolate);
    context->Enter();
    // haven't found a way to do this in the object template
    context->Global()->Set(V8Str("global"), context->Global());
    v8::Handle<v8::Value> result = v8_load_run_file(utils_filepath, context);
    if (!result.IsEmpty()) {
        v8::String::Utf8Value utf8(result->ToString());
        if (utf8.length())
            printf("%s\n", *utf8);
        return 0;
    } else {
        return 1;
    }
}

void sandbox_throw_error (const char  *message) {
    static const char* format = "{"
        "\"data\": {},"
        "\"error\": \"Internal Error: V8 sandbox, %s\","
        "\"result\": \"undefined\" }\n";

    fprintf (stdout, format, message);
    fflush (stdout);
    exit (1);
}
void sandbox_handle_caught(v8::TryCatch* try_catch) {
    v8::Handle<v8::Value> exc = try_catch->Exception();
    v8::String::Utf8Value message(exc->ToString());
    sandbox_throw_error(*message);
}

v8::Handle<v8::Context> sandboxContext(v8::Isolate* isolate) {
    v8::Handle<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
    global->Set(V8Str("version"),
        v8::String::Concat(V8Str("V8 "), V8Str(v8::V8::GetVersion())));
    global->Set(V8Str("exports"), v8::ObjectTemplate::New(isolate));
    v8::Handle<v8::Context> ctx = v8::Context::New(isolate, NULL, global);
    return ctx;
}

v8::Local<v8::String> get_stream_contents(v8::Isolate* isolate, std::istream& in);
v8::Local<v8::Value> compile_runstream(v8::Isolate* isolate, std::istream& strm, v8::ScriptOrigin *origin=NULL) {
    // if any of the values is empty, return so the caller can try_catch
    v8::Local<v8::String> source = get_stream_contents(isolate, strm);
    if (source.IsEmpty()) return source;
    v8::Local<v8::Script> script = v8::Script::Compile(source, origin);
    if (script.IsEmpty()) return v8::Handle<v8::Value>();
    return script->Run();
}
void execute(const v8::FunctionCallbackInfo<v8::Value>& args) {
    if (args.Length() != 0) {
        args.GetIsolate()->ThrowException(
            v8::String::NewFromUtf8(args.GetIsolate(), "execute does not accept parameters"));
        return;
    }
    v8::HandleScope handle_scope(args.GetIsolate());
    v8::Local<v8::Value> result = compile_runstream(args.GetIsolate(), std::cin);

    args.GetReturnValue().Set(result);
}

v8::Local<v8::Value> v8_load_run_file(const char* filename, v8::Handle<v8::Context> context) {
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    std::ifstream util_strm(filename, std::ios::in | std::ios::binary);
    v8::EscapableHandleScope handle_scope(isolate);
    v8::TryCatch try_catch;
    // get the exports object before running the script
    v8::Local<v8::Object> exports = context->Global()->Get(V8Str("exports"))->ToObject(); 

    v8::ScriptOrigin origin(V8Str(filename));
    if (compile_runstream(isolate, util_strm, &origin).IsEmpty()) {
        if (try_catch.HasCaught()) {
            sandbox_handle_caught(&try_catch);
        }
    }

    v8::Local<v8::Value> run = exports->Get(V8Str("run"));
    if (!run->IsFunction()) {
        if (try_catch.HasCaught()) {
            sandbox_handle_caught(&try_catch);
        }
        sandbox_throw_error("exports.run not a function");
    }
    v8::Local<v8::Function> runFun = v8::Handle<v8::Function>::Cast(run);
    v8::Local<v8::Function> execFun = v8::FunctionTemplate::New(isolate, execute)->GetFunction();
    v8::Handle<v8::Value> runFunArg[1] = { execFun };

    v8::Local<v8::Value> result = runFun->Call(context->Global(), 1, runFunArg);

    if (try_catch.HasCaught()) {
        sandbox_handle_caught(&try_catch);
    }
    return handle_scope.Escape(result);

}

v8::Local<v8::String> get_stream_contents(v8::Isolate* isolate, std::istream& in) {
    if (in) {
        in >> std::noskipws;
        std::istream_iterator<char> it(in);
        std::istream_iterator<char> end;
        std::string contents(it, end);
        // todo: return empty handle upon failure?
        return v8::String::NewFromUtf8(isolate, contents.c_str());
    }
    sandbox_throw_error("failed to load file");
}
