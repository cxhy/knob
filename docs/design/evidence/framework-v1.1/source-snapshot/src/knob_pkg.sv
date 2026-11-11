package knob_pkg;
  import uvm_pkg::*;
  `include "uvm_macros.svh"

  localparam longint KNOB_MIN = 64'sh8000_0000_0000_0000;
  localparam longint KNOB_MAX = 64'sh7fff_ffff_ffff_ffff;
  typedef enum { KNOB_INT, KNOB_BOOL } knob_kind;

  function automatic void knob_fail(string id, string message);
    uvm_report_fatal(id, message, UVM_NONE);
    // Also stop if the environment demotes or suppresses the UVM report.
    $fatal(1, "%s: %s", id, message);
  endfunction

  function automatic bit whitespace(byte c);
    return c inside {8'h09, 8'h0a, 8'h0b, 8'h0c, 8'h0d, 8'h20};
  endfunction

  function automatic string trim(string text);
    int first = 0;
    int last = text.len()-1;
    while (first <= last && whitespace(text[first])) first++;
    while (last >= first && whitespace(text[last])) last--;
    if (first > last) return "";
    return text.substr(first, last);
  endfunction

  function automatic bit valid_key(string key);
    bit first = 1;
    if (key.len() == 0) return 0;
    for (int i=0; i<key.len(); i++) begin
      byte c = key[i];
      if (c == ".") begin
        if (first) return 0;
        first = 1;
      end else begin
        if (!((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") ||
              c == "_" || (!first && c >= "0" && c <= "9"))) return 0;
        first = 0;
      end
    end
    return !first;
  endfunction

  // Parse a mathematical signed64 value without overflow or partial conversion.
  function automatic bit parse_integer(string text, output longint value,
                                       input bit allow_hex = 1);
    int pos = 0;
    int base = 10;
    bit negative = 0;
    longint unsigned magnitude = 0;
    longint unsigned limit;
    value = 0;
    if (text.len() == 0) return 0;
    if (text[0] == "-") begin negative = 1; pos++; end
    if (allow_hex && pos+1 < text.len() && text.substr(pos,pos+1) == "0x") begin
      base = 16;
      pos += 2;
    end
    if (pos == text.len()) return 0;
    limit = negative ? 64'h8000_0000_0000_0000 : 64'h7fff_ffff_ffff_ffff;
    for (int index=pos; index<text.len(); index++) begin
      int digit;
      byte c = text[index];
      if (c >= "0" && c <= "9") digit = c - "0";
      else if (c >= "a" && c <= "f") digit = c - "a" + 10;
      else if (c >= "A" && c <= "F") digit = c - "A" + 10;
      else return 0;
      if (digit >= base) return 0;
      if (magnitude > (limit - digit) / base) return 0;
      magnitude = magnitude * base + digit;
    end
    if (negative && magnitude == 64'h8000_0000_0000_0000) value = KNOB_MIN;
    else if (negative) value = -longint'(magnitude);
    else value = longint'(magnitude);
    return 1;
  endfunction

  function automatic int validate_seed();
    uvm_cmdline_processor cli = uvm_cmdline_processor::get_inst();
    string values[$];
    string args[$];
    longint seed;
    cli.get_args(args);
    foreach (args[i])
      if (args[i] == "+ntb_random_seed")
        knob_fail("KNOB_SEED", "seed must use +ntb_random_seed=<decimal>");
    if (cli.get_arg_values("+ntb_random_seed=", values) != 1)
      knob_fail("KNOB_SEED", "exactly one explicit numeric seed is required");
    if (!parse_integer(values[0], seed, 0) || seed < -64'sd2147483648 ||
        seed > 64'sd2147483647)
      knob_fail("KNOB_SEED", "seed must be a signed32 decimal integer");
    $display("KNOB_SEED value=%0d", seed);
    return int'(seed);
  endfunction

  class knob_entry;
    knob_kind kind;
    longint value, minimum, maximum;
    bit from_file = 0;
    bit used = 0;
  endclass

  virtual class knob_view;
    pure virtual function longint get_int(string key);
    pure virtual function bit get_bool(string key);
  endclass

  virtual class knob_validator;
    pure virtual function bit validate(knob_view values, output string reason);
  endclass

  // Detached scalar copy: callbacks never receive mutable store entries.
  // The concrete class is internal; callback authors use knob_view only.
  class knob_candidate_view extends knob_view;
    local knob_kind kinds[string];
    local longint values[string];
    local bit active = 1;
    function new(knob_entry source_entries[string]);
      foreach (source_entries[key]) begin
        kinds[key] = source_entries[key].kind;
        values[key] = source_entries[key].value;
      end
    endfunction
    function void close(); active = 0; endfunction
    local function longint read_value(string key, knob_kind kind);
      if (!active) knob_fail("KNOB_STATE", "candidate view is only valid during validation");
      if (!values.exists(key)) knob_fail("KNOB_UNKNOWN", {"validator read: ", key});
      if (kinds[key] != kind) knob_fail("KNOB_TYPE", {"validator read: ", key});
      return values[key];
    endfunction
    function longint get_int(string key); return read_value(key, KNOB_INT); endfunction
    function bit get_bool(string key); return bit'(read_value(key, KNOB_BOOL)); endfunction
  endclass

  class knob_store;
    local knob_entry entries[string];
    local bit frozen = 0;
    local bit loading = 0;
    local string lower_keys[$], upper_keys[$];
    local knob_validator validators[$];
    local string validator_names[$];

    function bit is_ready(); return frozen; endfunction

    function void add_validator(string name, knob_validator validator);
      require_registration();
      if (name == "" || validator == null)
        knob_fail("KNOB_REGISTER", "validator needs a name and a non-null object");
      foreach (validator_names[i])
        if (validator_names[i] == name) knob_fail("KNOB_REGISTER", {"duplicate validator: ", name});
      validator_names.push_back(name);
      validators.push_back(validator);
    endfunction

    local function void require_registration();
      if (frozen || loading) knob_fail("KNOB_STATE", "registration is closed");
    endfunction

    local function void require_ready();
      if (!frozen) knob_fail("KNOB_STATE", "configuration is not frozen");
    endfunction

    local function void register_value(string key, knob_kind kind, longint value,
                                      longint minimum, longint maximum);
      knob_entry entry;
      require_registration();
      if (!valid_key(key)) knob_fail("KNOB_REGISTER", {"invalid key: ", key});
      if (entries.exists(key)) knob_fail("KNOB_REGISTER", {"duplicate key: ", key});
      if (minimum > maximum || value < minimum || value > maximum)
        knob_fail("KNOB_REGISTER", {"invalid default or range: ", key});
      entry = new;
      entry.kind = kind;
      entry.value = value;
      entry.minimum = minimum;
      entry.maximum = maximum;
      entries[key] = entry;
    endfunction

    function void register_int(string key, longint value,
                               longint minimum = KNOB_MIN, longint maximum = KNOB_MAX);
      register_value(key, KNOB_INT, value, minimum, maximum);
    endfunction

    function void register_bool(string key, bit value);
      register_value(key, KNOB_BOOL, longint'(value), 0, 1);
    endfunction

    // Minimal cross-parameter rule. Both keys must already be registered integers.
    function void require_le(string lower_key, string upper_key);
      require_registration();
      if (!entries.exists(lower_key) || !entries.exists(upper_key))
        knob_fail("KNOB_REGISTER", "cross-check refers to an unknown key");
      if (entries[lower_key].kind != KNOB_INT || entries[upper_key].kind != KNOB_INT)
        knob_fail("KNOB_TYPE", "require_le needs integer keys");
      lower_keys.push_back(lower_key);
      upper_keys.push_back(upper_key);
    endfunction

    local function void parse_line(string line, int line_number);
      int equals = -1;
      string key, text, where_;
      longint value;
      for (int i=0; i<line.len(); i++) begin
        if (line[i] == "#") begin
          line = (i == 0) ? "" : line.substr(0,i-1);
          break;
        end
      end
      line = trim(line);
      if (line == "") return;
      where_ = $sformatf("knob.cfg:%0d: ", line_number);
      for (int i=0; i<line.len(); i++) begin
        if (line[i] == "=") begin
          if (equals != -1) knob_fail("KNOB_SYNTAX", {where_, "multiple equals signs"});
          equals = i;
        end
      end
      if (equals <= 0 || equals == line.len()-1)
        knob_fail("KNOB_SYNTAX", {where_, "expected nonempty key=value"});
      key = trim(line.substr(0,equals-1));
      text = trim(line.substr(equals+1,line.len()-1));
      if (!valid_key(key) || text == "") knob_fail("KNOB_SYNTAX", {where_, "invalid key/value"});
      if (!entries.exists(key)) knob_fail("KNOB_UNKNOWN", {where_, key});
      if (entries[key].from_file) knob_fail("KNOB_DUPLICATE", {where_, key});
      case (entries[key].kind)
        KNOB_INT: if (!parse_integer(text, value)) knob_fail("KNOB_VALUE", {where_, key, " invalid signed64"});
        KNOB_BOOL: begin
          if (text == "true") value = 1;
          else if (text == "false") value = 0;
          else knob_fail("KNOB_VALUE", {where_, key, " expects true/false"});
        end
        default: knob_fail("KNOB_TYPE", {where_, "unsupported type"});
      endcase
      if (value < entries[key].minimum || value > entries[key].maximum)
        knob_fail("KNOB_RANGE", {where_, key});
      entries[key].value = value;
      entries[key].from_file = 1;
    endfunction

    function void load_and_freeze();
      int fd, line_number = 0, error_code;
      string line, error_message;
      require_registration();
      loading = 1;
      fd = $fopen("knob.cfg", "r");
      if (fd == 0) knob_fail("KNOB_FILE", "cannot open knob.cfg");
      while ($fgets(line, fd) != 0) begin
        line_number++;
        parse_line(line, line_number);
      end
      error_code = $ferror(fd, error_message);
      $fclose(fd);
      if (error_code != 0) knob_fail("KNOB_FILE", error_message);
      foreach (lower_keys[i])
        if (entries[lower_keys[i]].value > entries[upper_keys[i]].value)
          knob_fail("KNOB_CROSS", {lower_keys[i], " must be <= ", upper_keys[i]});
      foreach (validators[i]) begin
        knob_candidate_view candidate;
        string reason;
        bit accepted;
        candidate = new(entries);
        accepted = validators[i].validate(candidate, reason);
        candidate.close();
        if (!accepted) knob_fail("KNOB_CHECK", {validator_names[i], ": ", reason});
      end
      frozen = 1;
      loading = 0;
      foreach (entries[key]) begin
        string rendered, source_name;
        if (entries[key].kind == KNOB_BOOL) rendered = entries[key].value ? "true" : "false";
        else rendered = $sformatf("%0d", entries[key].value);
        if (entries[key].from_file) source_name = "file";
        else source_name = "default";
        $display("KNOB_VALUE %s=%s source=%s", key, rendered, source_name);
      end
    endfunction

    local function longint read_value(string key, knob_kind kind);
      require_ready();
      if (!entries.exists(key)) knob_fail("KNOB_UNKNOWN", key);
      if (entries[key].kind != kind) knob_fail("KNOB_TYPE", key);
      entries[key].used = 1;
      return entries[key].value;
    endfunction

    function longint get_int(string key);
      return read_value(key, KNOB_INT);
    endfunction

    function bit get_bool(string key);
      return bit'(read_value(key, KNOB_BOOL));
    endfunction

    function void report_unused();
      require_ready();
      foreach (entries[key])
        if (!entries[key].used) $display("KNOB_UNUSED %s", key);
    endfunction
  endclass

  // A scoped reader is composed into existing sequences, never a required base class.
  class knob_scope;
    local knob_store store;
    local string prefix;
    function new(knob_store store, string usage_scope);
      if (store == null || !valid_key(usage_scope))
        knob_fail("KNOB_REGISTER", "scope needs a store and a valid logical name");
      this.store = store;
      prefix = usage_scope;
    endfunction
    function string key(string name);
      if (!valid_key(name)) knob_fail("KNOB_REGISTER", {"invalid local key: ", name});
      return {prefix, ".", name};
    endfunction
    function longint get_int(string name); return store.get_int(key(name)); endfunction
    function bit get_bool(string name); return store.get_bool(key(name)); endfunction
    function bit is_ready(); return store.is_ready(); endfunction
  endclass

  // Declarations are copied into each bound scope. The schema seals on first bind.
  class knob_schema;
    local knob_entry declarations[string];
    local string lower_names[$], upper_names[$];
    local bit sealed = 0;
    local function void define_value(string name, knob_kind kind, longint value,
                                     longint minimum, longint maximum);
      knob_entry entry;
      if (sealed) knob_fail("KNOB_STATE", "schema is sealed after its first bind");
      if (!valid_key(name) || declarations.exists(name))
        knob_fail("KNOB_REGISTER", {"invalid or duplicate declaration: ", name});
      if (minimum > maximum || value < minimum || value > maximum)
        knob_fail("KNOB_REGISTER", {"invalid declaration default/range: ", name});
      entry = new;
      entry.kind = kind;
      entry.value = value;
      entry.minimum = minimum;
      entry.maximum = maximum;
      declarations[name] = entry;
    endfunction
    function void define_int(string name, longint value,
                             longint minimum = KNOB_MIN, longint maximum = KNOB_MAX);
      define_value(name, KNOB_INT, value, minimum, maximum);
    endfunction
    function void define_bool(string name, bit value);
      define_value(name, KNOB_BOOL, longint'(value), 0, 1);
    endfunction
    function void require_le(string lower_name, string upper_name);
      if (sealed) knob_fail("KNOB_STATE", "schema is sealed after its first bind");
      if (!declarations.exists(lower_name) || !declarations.exists(upper_name))
        knob_fail("KNOB_REGISTER", "schema comparison refers to an unknown declaration");
      if (declarations[lower_name].kind != KNOB_INT || declarations[upper_name].kind != KNOB_INT)
        knob_fail("KNOB_TYPE", "schema comparison requires integer declarations");
      lower_names.push_back(lower_name);
      upper_names.push_back(upper_name);
    endfunction
    function knob_scope bind_scope(knob_store store, string usage_scope);
      knob_scope scope;
      if (store == null) knob_fail("KNOB_REGISTER", "cannot bind to a null store");
      if (store.is_ready()) knob_fail("KNOB_STATE", "cannot bind after freeze");
      scope = new(store, usage_scope);
      foreach (declarations[name]) begin
        knob_entry entry = declarations[name];
        case (entry.kind)
          KNOB_INT: store.register_int(scope.key(name), entry.value, entry.minimum, entry.maximum);
          KNOB_BOOL: store.register_bool(scope.key(name), bit'(entry.value));
          default: knob_fail("KNOB_TYPE", "unsupported declaration type");
        endcase
      end
      foreach (lower_names[i]) store.require_le(scope.key(lower_names[i]), scope.key(upper_names[i]));
      sealed = 1;
      return scope;
    endfunction
  endclass
endpackage
