// WebAssembly roots live on both the linear C stack and the VM value stack.
// Emscripten's Asyncify scanner exposes both to MicroPython's collector.
#include <stdint.h>
#include <emscripten/emscripten.h>
#include "py/gc.h"
static void collect_region(void *start, void *end){gc_collect_root((void **)start,((uintptr_t)end-(uintptr_t)start)/sizeof(uintptr_t));}
void gc_helper_collect_regs_and_stack(void){emscripten_scan_stack(collect_region);emscripten_scan_registers(collect_region);}
