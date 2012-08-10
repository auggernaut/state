class Mover
  state @::, 'abstract'
    Stationary: state
    Moving: state 'default abstract'
      Walking: state
      Running: state 'default'

mover = new Mover
mover.state '->'         # >>> State 'Running'
mover.state '-> Moving'  # >>> State 'Running'