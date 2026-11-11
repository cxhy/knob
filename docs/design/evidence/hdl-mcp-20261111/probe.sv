module probe_leaf #(parameter W=8)(input logic [W-1:0] a, output logic [W-1:0] y);
assign y=a;
endmodule
module probe_top(input logic [7:0] a, output logic [7:0] y);
probe_leaf #(.W(8)) u_leaf(.a(a),.y(y));
endmodule
