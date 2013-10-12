var canvase = null;
var ctx = null;

function FrameRateData(fps_cap, learn_rate) {
  var self = this;

  self.average_frame_rate = 0;
  self.last_frame_begin_time = 0;
  self.delta_cap = 1000 / fps_cap;
  self.should_delay = 0;
  self.learn_rate = learn_rate || 0.05;

  self.begin_frame = function () {
    self.frame_begin_time = new Date().getTime();
  };

  self.end_frame = function () {
    self.frame_end_time = new Date().getTime();

    var inner_delta_time = self.frame_end_time - self.frame_begin_time;
    var outer_delta_time = self.frame_begin_time - self.last_frame_begin_time;
    var current_frame_rate = 1000 / outer_delta_time;

    self.last_frame_begin_time = self.frame_begin_time;
    self.average_frame_rate =
      self.average_frame_rate * (1 - self.learn_rate) + 
      current_frame_rate * self.learn_rate;
    self.should_delay = self.delta_cap - inner_delta_time;
    if(self.should_delay < 0)
      self.should_delay = 0;
  };

  self.render = function () { 
    ctx.fillStyle = "#FFFF00";
    ctx.font = "28px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("fps: " + self.average_frame_rate, 500, 30);
  };
}

function euclid_dist(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function rand_between(lo, hi) {
  return Math.floor(lo + Math.random() * (hi - lo));
}

function generate_settlements(count, distance_tolerance) {
  function get_random_place() {
    var t = distance_tolerance;
    return { x: rand_between(t, canvas.width - t),
             y: rand_between(t, canvas.height - t)
           };
  }

  function is_reasonable_settlement_place(place) {
    for(var i = 0; i < settlements.length; i++) {
      var distance = euclid_dist(settlements[i].place, place);
      if(distance < distance_tolerance * 2)
        return false;
    }
    return true;
  }

  function get_new_settlement() {
    var place = get_random_place();
    while(!is_reasonable_settlement_place(place)) {
      place = get_random_place();
    }
    return new Settlement(place);
  }

  var settlements = [];
  for(var i = 0; i < count; i++) {
    settlements.push(get_new_settlement());
  }
  return settlements;
}

const SETTLEMENT_SIZE = 30;
const SETTLEMENT_COLORS = 
  [{front: "#000099", back: "#AAAAAA"},
   {front: "#DDDDDD", back: "#2222DD"},
   {front: "#000099", back: "#FF4444"}];

function Settlement(place) {
  var self = this;
  const SETTLEMENT_GROW_RATE = 0.03;

  self.place = { x: place.x,
                 y: place.y 
               };
  self.side = 0;
  self.number = 0;

  self.render = function () {
    self.render_ball();

    if(self.side > 0)
      self.render_number();
  }

  self.render_ball = function () {
    ctx.fillStyle = SETTLEMENT_COLORS[self.side].back;
    ctx.beginPath();
    ctx.arc(self.place.x, self.place.y, SETTLEMENT_SIZE, 0, 2 * Math.PI);
    ctx.fill();
  }

  self.render_number = function () {
    ctx.fillStyle = SETTLEMENT_COLORS[self.side].front;
    ctx.font = "27px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.floor(self.number), self.place.x, self.place.y);
  }

  self.grow = function () {
    if(self.side == 0)
      self.number = 0;
    else if(self.number < 99)
      self.number += SETTLEMENT_GROW_RATE;
    // else do nothing
  }
}

function Troop(origin_settlement_index, dest_settlement_index, settlements) {
  var self = this;
  const ONGOING_TROOPS_SPEED = 0.8;

  var origin_settlement = settlements[origin_settlement_index];
  self.origin_index = origin_settlement_index;
  self.place = { x: origin_settlement.place.x,
                 y: origin_settlement.place.y
               };
  self.side = origin_settlement.side;
  self.dest_index = dest_settlement_index;
  self.number = origin_settlement.number / 2;

  self.march = function () {
    self.advance(ONGOING_TROOPS_SPEED);
  };

  self.render = function () {
    self.render_tail();
    self.render_ball();

    settlements[self.origin_index].render();
    settlements[self.dest_index].render();
  };

  self.render_ball = function () {
    const BALL_SIZE_CAP = 35;

    var outer_ball_size = BALL_SIZE_CAP * (self.number / 50.0);
    var inner_ball_size = outer_ball_size - 2;
    if(inner_ball_size < 1)
      inner_ball_size = 1;

    ctx.fillStyle = "#BBBBBB";
    ctx.beginPath();
    ctx.arc(self.place.x, self.place.y, outer_ball_size, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = SETTLEMENT_COLORS[self.side].back;
    ctx.beginPath();
    ctx.arc(self.place.x, self.place.y, inner_ball_size, 0, 2 * Math.PI);
    ctx.fill();
  };

  self.render_tail = function () {
    const TAIL_LENGTH = 70;
    var dest_place = settlements[self.dest_index].place;
    var origin_place = settlements[self.origin_index].place;
    var back_dist = euclid_dist(origin_place, self.place);
    var tail_length = TAIL_LENGTH;
    if(tail_length > back_dist)
      tail_length = back_dist;

    var long_offset_x = dest_place.x - self.place.x;
    var long_offset_y = dest_place.y - self.place.y;
    
var long_dist = euclid_dist(dest_place, self.place);

    var step_x = tail_length * long_offset_x / long_dist;
    var step_y = tail_length * long_offset_y / long_dist;
    var tail_end_x = self.place.x - step_x;
    var tail_end_y = self.place.y - step_y;

    ctx.strokeStyle = "#BBBBBB";
    ctx.lineWidth = 3;
    ctx.moveTo(self.place.x, self.place.y);
    ctx.lineTo(tail_end_x, tail_end_y);
    ctx.stroke();
  };

  self.advance = function (dist) {
    var dest_place = settlements[self.dest_index].place;
    var long_offset_x = dest_place.x - self.place.x;
    var long_offset_y = dest_place.y - self.place.y;
    var long_dist = euclid_dist(dest_place, self.place);
    var step_x = dist * long_offset_x / long_dist;
    var step_y = dist * long_offset_y / long_dist;

    if(long_dist >= dist) {
      self.place.x += step_x;
      self.place.y += step_y;
    }
  };

  self.check_arrival = function () {
    var dest = settlements[self.dest_index];

    if(euclid_dist(self.place, dest.place) < SETTLEMENT_SIZE) {
      if(self.side != dest.side) { // invasion and battle
        if(self.number > dest.number) { // invasion win
          dest.number = self.number - dest.number;
          dest.side = self.side;
        } else { // defense win
          dest.number -= self.number;
        }
      } else { // reinforcement
        dest.number += self.number;
      }

      if(dest.number > 99)
        dest.number = 99;

      self.finished = true;
    }
  };
}

function hit_settlement(x, y, settlements) {
  var mouse_place = { x: x, y: y };
  for(var i = 0; i < settlements.length; i++)
    if(euclid_dist(mouse_place, settlements[i].place) < SETTLEMENT_SIZE)
      return i;
  
  return -1;
}

function GameAI(game) {
  var self = this;
  const AUTO_COMMAND_INTERVAL = 200;

  self.frame_counter = 0;
  self.game = game;
  
  self.perform_frame_turn = function () {
    self.update_frame_counter();

    if(self.frame_counter % AUTO_COMMAND_INTERVAL == 0) {
      return self.generate_random_command();
    } else {
      return null;
    }   
  };

  self.update_frame_counter = function () {
    self.frame_counter++;
    if(self.frame_counter > 1000 * 1000)
      self.frame_counter = 0;
  };

  self.generate_random_command = function () {
    var side = rand_between(2, 3);
    var occupied_settlements = [];
    var settlements = self.game.settlements;
    for(var i = 0; i < settlements.length; i++) {
      var s = settlements[i];
      if(s.side == side)
        occupied_settlements.push(i);
    }
    var origin_index = 
      occupied_settlements[rand_between(0, occupied_settlements.length)];
    var dest_index = rand_between(0, settlements.length);
    while(dest_index == origin_index)
      dest_index = rand_between(0, settlements.length);
    return { origin_indexes: [origin_index],
             dest_index: dest_index
           };
  };
}

function Game() {
  var self = this;

  self.settlements = generate_settlements(10, 50);
  self.ongoing_troops = [];
  self.half_command = null;
  self.current_mouse_place = { x: 0, y: 0};
  self.victory = null;
  self.ai = new GameAI(self);

  self.set_origin_player_settlements = function (player_count) {
    for(var i = 0; i < player_count; i++) {
      self.settlements[i].number = 50;
      self.settlements[i].side = i + 1;
    }
  };

  self.set_origin_player_settlements(2);

  self.update = function () {
    if(self.victory)
      return;

    self.update_victory();
    self.update_ongoing_troops();
    self.update_settlements();

    var command = self.ai.perform_frame_turn();
    if(command)
      self.execute_command(command);
  };

  self.update_victory = function () {
    var player_domain_count = [0, 0, 0];
    for(var i = 0; i < self.settlements.length; i++) {
      player_domain_count[self.settlements[i].side]++;
    }
    if(player_domain_count[1] == 0)
      self.victory = "You lose";
    else if(player_domain_count[2] == 0)
      self.victory = "You win";
    else 
      self.victory = null;
  }

  self.update_ongoing_troops = function () {
    self.march_troops();
    self.check_troops_arrival();
    self.remove_finished_troops();
  };

  self.update_settlements = function () {
    for(var i = 0; i < self.settlements.length; i++) {
      self.settlements[i].grow();
    }
  };

  self.march_troops = function () {
    for(var i = 0; i < self.ongoing_troops.length; i++)
      self.ongoing_troops[i].march();
  };

  self.check_troops_arrival = function () {
    for(var i = 0; i < self.ongoing_troops.length; i++)
      self.ongoing_troops[i].check_arrival();
  };

  self.remove_finished_troops = function () {
    var remaining_troops = []

    for(var i = 0; i < self.ongoing_troops.length; i++) {
      var t = self.ongoing_troops[i];
      if(!t.finished)
        remaining_troops.push(t);
    }

    self.ongoing_troops = remaining_troops;
  };

  self.render = function () {
    self.render_settlements();
    self.render_ongoing_troops();
    self.render_half_command();
    self.render_victory();
  };

  self.render_settlements = function () {
    for(var i = 0; i < self.settlements.length; i++) {
      self.settlements[i].render();
    }
  };

  self.render_ongoing_troops = function () {
    for(var i = 0; i < self.ongoing_troops.length; i++) {
      self.ongoing_troops[i].render();
    }
  };

  self.render_half_command = function () {
    if(self.half_command) {
      for(var i = 0; i < self.half_command.origin_indexes.length; i++) {
        var origin_place = 
          self.settlements[self.half_command.origin_indexes[i]].place;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.moveTo(origin_place.x, origin_place.y);
        ctx.lineTo(self.current_mouse_place.x, self.current_mouse_place.y);
        ctx.stroke();
      }
    }
  };

  self.render_victory = function () {
    if(self.victory) {
      ctx.fillStyle = "#FFFF00";
      ctx.font = "57px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(self.victory, canvas.width / 2, canvas.height / 2);
    }
  };

  self.execute_command = function (command) {
    for(var i = 0; i < command.origin_indexes.length; i++) {
      var s = self.settlements[command.origin_indexes[i]];
      var troop = new Troop(command.origin_indexes[i], 
                            command.dest_index, 
                            self.settlements);
      self.ongoing_troops.push(troop);
      s.number /= 2;
    }
  };

  self.mouse_down = function (x, y) {
    if(self.victory)
      return;

    if(!self.half_command) {
      var s_index = hit_settlement(x, y, self.settlements);
      if(s_index >= 0 && self.settlements[s_index].side == 1) { // side 1 is player
        self.half_command = {
          origin_indexes: [s_index]
        };
      }
    }
  };

  self.mouse_up = function (x, y) {
    if(self.victory)
      return;

    if(self.half_command) {
      var s_index = hit_settlement(x, y, self.settlements);
      origin_indexes = self.half_command.origin_indexes;

      if(s_index >= 0 && origin_indexes.indexOf(s_index) < 0) {
        // execute half command to attack alien settlement
        var command = {
          origin_indexes: origin_indexes,
          dest_index: s_index
        };
        self.execute_command(command);
        self.half_command = null;        
      } else if(s_index >= 0 && 
                origin_indexes.indexOf(s_index) == origin_indexes.length - 1) {
        // execute half command to reinforce own settlement
        var command = {
          origin_indexes: origin_indexes.slice(0, origin_indexes.length - 1),
          dest_index: s_index
        };
        self.execute_command(command);
        self.half_command = null;        
      } else { 
        // cancel half_command
        self.half_command = null;        
      }
    }
  };

  self.mouse_move = function (x, y) {
    if(self.victory)
      return;

    self.current_mouse_place = { x: x, y: y };

    if(self.half_command) {
      var s_index = hit_settlement(x, y, self.settlements);
      if(s_index >= 0 && 
         self.settlements[s_index].side == 1 &&  // side 1 is player
         self.half_command.origin_indexes.indexOf(s_index) < 0) {
        self.half_command.origin_indexes.push(s_index);
      }
    }
  };
}

function main() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  start_main_loop();
}

function start_main_loop () {
  var frame_rate_data = new FrameRateData(60, 0.05);
  var game = new Game();

  canvas.addEventListener("mousedown", function (e) {
    game.mouse_down(e.offsetX, e.offsetY);
  });

  canvas.addEventListener("mouseup", function (e) {
    game.mouse_up(e.offsetX, e.offsetY);
  });

  canvas.addEventListener("mousemove", function (e) {
    game.mouse_move(e.offsetX, e.offsetY);
  });

  setTimeout(function () {
    main_loop(frame_rate_data, game);
  }, 0);
}

function clear_screen() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function main_loop(frame_rate_data, game) {
  frame_rate_data.begin_frame();

  clear_screen();

  game.update();
  game.render();
  frame_rate_data.render();

  frame_rate_data.end_frame();

  setTimeout(function () {
    main_loop(frame_rate_data, game);
  }, frame_rate_data.should_delay);
}
