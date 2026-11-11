package knob_demo_pkg;
  import uvm_pkg::*;
  import knob_pkg::*;
  `include "uvm_macros.svh"

  class packet_sequence extends uvm_sequence;
    `uvm_object_utils(packet_sequence)
    // Configuration fields deliberately are not rand.
    local int packet_count, min_length, max_length;
    local bit enabled, applied = 0;
    local string usage_scope;
    rand int packet_length;
    rand bit [31:0] payload;
    constraint lengths {
      packet_length inside {[min_length:max_length]};
      packet_length % 2 == 0; // Example protocol constraint, independent of knob.
    }
    function new(string name = "packet_sequence"); super.new(name); endfunction
    function void apply_knobs(knob_store knobs, string scope_name);
      usage_scope = scope_name;
      // Registered ranges guarantee these conversions fit int.
      packet_count = int'(knobs.get_int({usage_scope, ".packet_count"}));
      min_length = int'(knobs.get_int({usage_scope, ".min_length"}));
      max_length = int'(knobs.get_int({usage_scope, ".max_length"}));
      enabled = knobs.get_bool({usage_scope, ".enabled"});
      applied = 1;
    endfunction
    function void pre_randomize();
      if (!applied) knob_fail("KNOB_APPLY", "apply_knobs must precede randomize");
    endfunction
    virtual task body();
      if (!applied) knob_fail("KNOB_APPLY", "apply_knobs must precede start");
      $display("SEQUENCE scope=%s count=%0d enabled=%0d", usage_scope, packet_count, enabled);
      if (enabled) begin
        for (int i=0; i<packet_count; i++) begin
          if (!this.randomize()) knob_fail("KNOB_RANDOMIZE", "packet constraints are unsatisfiable");
          $display("TX scope=%s index=%0d length=%0d payload=%08h", usage_scope, i, packet_length, payload);
        end
      end
    endtask
  endclass

  class knob_demo_test extends uvm_test;
    `uvm_component_utils(knob_demo_test)
    knob_store knobs;
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    virtual function void before_registration(); endfunction
    virtual function void after_registration(); endfunction
    virtual function void after_freeze(); endfunction
    function void build_phase(uvm_phase phase);
      super.build_phase(phase);
      void'(validate_seed());
      knobs = new;
      before_registration();
      for (int i=0; i<2; i++) begin
        string scope_name = $sformatf("agent%0d.tx", i);
        knobs.register_int({scope_name,".packet_count"}, 3, 0, 1000);
        knobs.register_int({scope_name,".min_length"}, 64, 1, 4096);
        knobs.register_int({scope_name,".max_length"}, 128, 1, 4096);
        knobs.register_bool({scope_name,".enabled"}, 1);
        knobs.require_le({scope_name,".min_length"}, {scope_name,".max_length"});
      end
      knobs.register_int("shared.unused", 0);
      after_registration();
    endfunction
    function void end_of_elaboration_phase(uvm_phase phase);
      knobs.load_and_freeze();
      after_freeze();
    endfunction
    task run_phase(uvm_phase phase);
      phase.raise_objection(this);
      // Repeat each logical scope to demonstrate stable configuration reuse.
      for (int round=0; round<2; round++) begin
        for (int agent=0; agent<2; agent++) begin
          packet_sequence seq;
          seq = packet_sequence::type_id::create($sformatf("seq_%0d_%0d",round,agent));
          seq.apply_knobs(knobs, $sformatf("agent%0d.tx",agent));
          seq.start(null);
        end
      end
      knobs.report_unused();
      $display("KNOB_DEMO_PASS");
      phase.drop_objection(this);
    endtask
  endclass

  class schema_test extends knob_demo_test;
    `uvm_component_utils(schema_test)
    knob_schema schema;
    knob_scope scopes[2];
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void build_phase(uvm_phase phase);
      // This variant deliberately uses the new declaration API for the same behavior.
      void'(validate_seed());
      knobs = new;
      schema = new;
      schema.define_int("packet_count", 3, 0, 1000);
      schema.define_int("min_length", 64, 1, 4096);
      schema.define_int("max_length", 128, 1, 4096);
      schema.define_bool("enabled", 1);
      schema.require_le("min_length", "max_length");
      for (int i=0; i<2; i++) scopes[i] = schema.bind_scope(knobs, $sformatf("agent%0d.tx",i));
      knobs.register_int("shared.unused", 0);
      after_registration();
    endfunction
    function void after_freeze();
      if (!knobs.is_ready() || !scopes[0].is_ready()) knob_fail("TEST_READY", "not ready after load");
      $display("SCHEMA_COUNTS %0d %0d", scopes[0].get_int("packet_count"), scopes[1].get_int("packet_count"));
    endfunction
  endclass
  class duplicate_bind_test extends schema_test;
    `uvm_component_utils(duplicate_bind_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_registration(); void'(schema.bind_scope(knobs, "agent0.tx")); endfunction
  endclass

  class budget_validator extends knob_validator;
    knob_store owner;
    knob_view saved_view;
    int mode;
    function new(knob_store owner, int mode=0); this.owner=owner; this.mode=mode; endfunction
    function bit validate(knob_view values, output string reason);
      longint total = 0;
      saved_view = values;
      if (mode == 1) void'(owner.get_int("agent0.tx.packet_count"));
      if (mode == 3) void'(values.get_bool("agent0.tx.packet_count"));
      if (mode == 4) owner.register_int("late.callback", 0);
      for (int i=0; i<2; i++) begin
        string prefix = $sformatf("agent%0d.tx.",i);
        if (values.get_bool({prefix,"enabled"})) total += values.get_int({prefix,"packet_count"});
      end
      reason = "enabled packet counts must total <= 10";
      return total <= 10;
    endfunction
  endclass
  class callback_test extends schema_test;
    `uvm_component_utils(callback_test)
    budget_validator budget_check;
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    virtual function int callback_mode(); return 0; endfunction
    function void after_registration();
      budget_check = new(knobs, callback_mode());
      knobs.add_validator("packet_budget", budget_check);
    endfunction
    function void after_freeze();
      super.after_freeze();
      if (callback_mode() == 2) void'(budget_check.saved_view.get_int("agent0.tx.packet_count"));
    endfunction
  endclass
  `define CALLBACK_TEST(NAME, MODE) \
    class NAME extends callback_test; \
      `uvm_component_utils(NAME) \
      function new(string name, uvm_component parent); super.new(name,parent); endfunction \
      function int callback_mode(); return MODE; endfunction \
    endclass
  `CALLBACK_TEST(callback_early_read_test, 1)
  `CALLBACK_TEST(callback_expired_view_test, 2)
  `CALLBACK_TEST(callback_type_test, 3)
  `CALLBACK_TEST(callback_mutation_test, 4)
  `undef CALLBACK_TEST

  `define REGISTRATION_FAULT(NAME, BODY) \
    class NAME extends knob_demo_test; \
      `uvm_component_utils(NAME) \
      function new(string name, uvm_component parent); super.new(name,parent); endfunction \
      function void after_registration(); BODY endfunction \
    endclass
  `REGISTRATION_FAULT(invalid_default_test, knobs.register_int("bad.default", 2, 0, 1);)
  `REGISTRATION_FAULT(invalid_range_test, knobs.register_int("bad.range", 0, 1, 0);)
  `REGISTRATION_FAULT(invalid_key_test, knobs.register_int("bad..key", 0);)
  `REGISTRATION_FAULT(null_validator_test, knobs.add_validator("null_check", null);)
  `undef REGISTRATION_FAULT

  class unapplied_sequence_test extends knob_demo_test;
    `uvm_component_utils(unapplied_sequence_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_freeze();
      packet_sequence seq = packet_sequence::type_id::create("unapplied");
      void'(seq.randomize());
    endfunction
  endclass
  class sealed_schema_test extends schema_test;
    `uvm_component_utils(sealed_schema_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_registration(); schema.define_bool("too_late", 1); endfunction
  endclass
  class duplicate_validator_test extends callback_test;
    `uvm_component_utils(duplicate_validator_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_registration();
      super.after_registration();
      knobs.add_validator("packet_budget",budget_check);
    endfunction
  endclass
  class late_validator_test extends callback_test;
    `uvm_component_utils(late_validator_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_freeze(); knobs.add_validator("too_late",budget_check); endfunction
  endclass

  // Fault injection uses UVM test selection, never command-line knob overrides.
  class early_read_test extends knob_demo_test;
    `uvm_component_utils(early_read_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void before_registration(); void'(knobs.get_int("agent0.tx.packet_count")); endfunction
  endclass
  class duplicate_registration_test extends knob_demo_test;
    `uvm_component_utils(duplicate_registration_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_registration(); knobs.register_int("shared.unused", 0); endfunction
  endclass
  class late_registration_test extends knob_demo_test;
    `uvm_component_utils(late_registration_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_freeze(); knobs.register_int("late.value", 0); endfunction
  endclass
  class reload_test extends knob_demo_test;
    `uvm_component_utils(reload_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_freeze(); knobs.load_and_freeze(); endfunction
  endclass
  class wrong_type_test extends knob_demo_test;
    `uvm_component_utils(wrong_type_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void after_freeze(); void'(knobs.get_bool("agent0.tx.packet_count")); endfunction
  endclass
endpackage

module tb;
  import uvm_pkg::*;
  import knob_demo_pkg::*;
  initial run_test();
endmodule
