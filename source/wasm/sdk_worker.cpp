// The engine is already in a dedicated browser Worker, with an 8 MB C stack.
// Run Python synchronously there; no shared-memory pthread/COOP/COEP requirement.
#include "sdk/worker.hpp"
namespace opense4::sdk {
std::timed_mutex& interpreterSlot(){static std::timed_mutex mutex;return mutex;}
struct Worker::Impl {};
Worker::Worker(size_t):impl_(std::make_unique<Impl>()){}
Worker::~Worker()=default;
void Worker::run(const std::function<void()>& task){task();}
}
