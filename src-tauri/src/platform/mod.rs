//! Input backend. Windows is the only implementation today; the module boundary
//! keeps a Linux (uinput/evdev) backend straightforward to add.

#[cfg(windows)]
pub mod windows;

#[cfg(windows)]
pub use windows::{hook, macros};

#[cfg(not(windows))]
compile_error!("the AK820 companion currently supports Windows only");
