package host_pkg;
  import uvm_pkg::*;
  import knob_pkg::*;
  `include "uvm_macros.svh"

  class host_packet extends uvm_sequence_item;
    `uvm_object_utils(host_packet)
    rand int length;
    rand bit [31:0] payload;
    int min_length, max_length;
    constraint legal_length { length inside {[min_length:max_length]}; length % 2 == 0; }
    function new(string name="host_packet"); super.new(name); endfunction
  endclass

  // Existing host inheritance is retained. Neither base class depends on knob.
  class existing_sequence_base extends uvm_sequence #(host_packet);
    function new(string name="existing_sequence_base"); super.new(name); endfunction
  endclass
  class existing_test_base extends uvm_test;
    bit host_initialized;
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void build_phase(uvm_phase phase);
      super.build_phase(phase);
      host_initialized = 1;
    endfunction
  endclass

  class host_sequence extends existing_sequence_base;
    `uvm_object_utils(host_sequence)
    local int count, minimum, maximum;
    local bit enabled, applied;
    rand bit [7:0] sequence_tag;
    function new(string name="host_sequence"); super.new(name); endfunction
    function void apply_knobs(knob_scope cfg);
      count = int'(cfg.get_int("count"));
      minimum = int'(cfg.get_int("min_length"));
      maximum = int'(cfg.get_int("max_length"));
      enabled = cfg.get_bool("enabled");
      applied = 1;
    endfunction
    function void pre_randomize();
      if (!applied) knob_fail("KNOB_APPLY", "host_sequence needs apply_knobs before randomize");
    endfunction
    task body();
      if (!applied) knob_fail("KNOB_APPLY", "host_sequence needs apply_knobs before start");
      $display("HOST_SEQUENCE tag=%0d count=%0d enabled=%0d", sequence_tag, count, enabled);
      if (enabled) for (int i=0; i<count; i++) begin
        host_packet packet = host_packet::type_id::create("packet");
        // Apply deterministic bounds before item randomization too.
        packet.min_length = minimum;
        packet.max_length = maximum;
        start_item(packet);
        if (!packet.randomize()) knob_fail("KNOB_RANDOMIZE", "host packet has no legal length");
        finish_item(packet);
      end
    endtask
  endclass

  class host_driver extends uvm_driver #(host_packet);
    `uvm_component_utils(host_driver)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    task run_phase(uvm_phase phase);
      forever begin
        seq_item_port.get_next_item(req);
        #1ns;
        $display("HOST_TX port=%s length=%0d payload=%08h", get_parent().get_name(), req.length, req.payload);
        seq_item_port.item_done();
      end
    endtask
  endclass
  class host_agent extends uvm_agent;
    `uvm_component_utils(host_agent)
    uvm_sequencer #(host_packet) sequencer;
    host_driver driver;
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void build_phase(uvm_phase phase);
      super.build_phase(phase);
      sequencer = new("sequencer",this);
      driver = host_driver::type_id::create("driver",this);
    endfunction
    function void connect_phase(uvm_phase phase);
      driver.seq_item_port.connect(sequencer.seq_item_export);
    endfunction
  endclass
  class host_env extends uvm_env;
    `uvm_component_utils(host_env)
    host_agent agents[2];
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void build_phase(uvm_phase phase);
      super.build_phase(phase);
      for (int i=0; i<2; i++) agents[i] = host_agent::type_id::create($sformatf("link%0d",i),this);
    endfunction
  endclass

  class host_budget_check extends knob_validator;
    function bit validate(knob_view values, output string reason);
      longint total = 0;
      for (int i=0; i<2; i++) begin
        string prefix = $sformatf("link%0d.tx.",i);
        if (values.get_bool({prefix,"enabled"})) total += values.get_int({prefix,"count"});
      end
      reason = "sum of enabled link counts exceeds shared.budget";
      return total <= values.get_int("shared.budget");
    endfunction
  endclass

  class host_test extends existing_test_base;
    `uvm_component_utils(host_test)
    host_env env;
    knob_store knobs;
    knob_scope scopes[2];
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void build_phase(uvm_phase phase);
      knob_schema schema;
      host_budget_check budget_check;
      super.build_phase(phase);
      void'(validate_seed());
      env = host_env::type_id::create("env",this);
      knobs = new;
      schema = new;
      schema.define_int("count", 2, 0, 1000);
      schema.define_int("min_length", 64, 1, 4096);
      schema.define_int("max_length", 128, 1, 4096);
      schema.define_bool("enabled", 1);
      schema.require_le("min_length","max_length");
      for (int i=0; i<2; i++) scopes[i] = schema.bind_scope(knobs,$sformatf("link%0d.tx",i));
      knobs.register_int("shared.budget",16,0,2000);
      budget_check = new;
      knobs.add_validator("host_budget",budget_check);
    endfunction
    function void end_of_elaboration_phase(uvm_phase phase);
      knobs.load_and_freeze();
      if (!knobs.is_ready()) `uvm_fatal("HOST_READY", "knob initialization failed")
    endfunction
    task run_phase(uvm_phase phase);
      phase.raise_objection(this);
      if (!host_initialized) `uvm_fatal("HOST_BASE", "host base build was skipped")
      for (int round=0; round<2; round++) begin
        for (int i=0; i<2; i++) begin
          host_sequence seq = host_sequence::type_id::create($sformatf("seq_%0d_%0d",round,i));
          seq.apply_knobs(scopes[i]);
          if (!seq.randomize()) knob_fail("KNOB_RANDOMIZE", "host sequence randomization failed");
          seq.start(env.agents[i].sequencer);
        end
      end
      knobs.report_unused();
      phase.drop_objection(this);
    endtask
  endclass
  // Harness fixture for native simulator failures, independent of knob diagnostics.
  class host_runtime_abort_test extends host_test;
    `uvm_component_utils(host_runtime_abort_test)
    function new(string name, uvm_component parent); super.new(name,parent); endfunction
    function void start_of_simulation_phase(uvm_phase phase);
      $fatal(1, "HOST_RUNTIME_ABORT: deliberate native simulator failure");
    endfunction
  endclass
endpackage

module host_tb;
  import uvm_pkg::*;
  import host_pkg::*;
  initial run_test();
endmodule
