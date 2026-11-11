// Isolated integration probe; not a new public API.
package lifecycle_probe_pkg;
  import uvm_pkg::*;
  import knob_pkg::*;
  knob_store store;
  knob_scope cfg;
  function automatic void prepare();
    knob_schema schema;
    void'(validate_seed());
    store = new;
    schema = new;
    schema.define_int("minimum", 4, 1, 100);
    schema.define_int("maximum", 8, 1, 100);
    schema.define_bool("enabled", 1);
    schema.require_le("minimum", "maximum");
    cfg = schema.bind_scope(store, "alu.input");
    store.load_and_freeze();
    $display("LC_READY");
  endfunction
endpackage
