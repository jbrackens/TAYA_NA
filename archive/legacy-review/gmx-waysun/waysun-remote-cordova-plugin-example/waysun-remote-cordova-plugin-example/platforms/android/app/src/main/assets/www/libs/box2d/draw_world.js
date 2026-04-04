///// ������� ��� �������� ��������� �������� box2d /////

function drawWorld(world, stage)
{
	for (var j = world.m_jointList; j; j = j.m_next) drawJoint(world, j, stage);
	for (var b = world.m_bodyList; b; b = b.m_next)
	{
		for (var s = b.GetShapeList(); s != null; s = s.GetNext()) drawShape(s, stage);
	}
}

function drawJoint(world, joint, stage, color)
{
	var b1 = joint.m_body1;
	var b2 = joint.m_body2;
	var x1 = b1.m_position;
	var x2 = b2.m_position;
	var p1 = joint.GetAnchor1();
	var p2 = joint.GetAnchor2();
	if(!color) color = '#00f';
	
	switch (joint.m_type)
	{
		case b2Joint.e_distanceJoint:
			stage.drawLine(p1.x, p1.y, p2.x, p2.y, 1, color);
			break;

		case b2Joint.e_pulleyJoint:
			break;

		default:
			if (b1 == world.m_groundBody)
			{
				stage.drawLine(p1.x, p1.y, x2.x, x2.y, 1, color);
			}
			else if (b2 == world.m_groundBody)
			{
				stage.drawLine(p1.x, p1.y, x1.x, x1.y, 1, color);
			}
			else
			{
				stage.drawLine(x1.x, x1.y, p1.x, p1.y, 1, color);
				stage.drawLine(p1.x, p1.y, x2.x, x2.y, 1, color);
				stage.drawLine(x2.x, x2.y, p2.x, p2.y, 1, color);
			}
		break;
	}
}

function drawShape(shape, stage)
{
	switch (shape.m_type)
	{
		case b2Shape.e_circleShape:
			{
				var color = "#33f";
				
				var circle = shape;
				var pos = circle.m_position;
				var r = circle.m_radius;
				var segments = 16.0;
				var theta = 0.0;
				var dtheta = 2.0 * Math.PI / segments;
				
				var x = pos.x + r;
				var y = pos.y;
				
				for (var i = 0; i < segments; i++)
				{
					var d = new b2Vec2(r * Math.cos(theta), r * Math.sin(theta));
					var v = b2Math.AddVV(pos, d);
					
					stage.drawLine(x, y, v.x, v.y, 1, color);
					
					x = v.x;
					y = v.y;
					
					theta += dtheta;
				}
				
				stage.drawLine(x, y, pos.x + r, pos.y, 1, color);

				var ax = circle.m_R.col1;
				var pos2 = new b2Vec2(pos.x + r * ax.x, pos.y + r * ax.y);
				
				stage.drawLine(pos.x, pos.y, pos2.x, pos2.y, 1, color);
			}
			break;
		case b2Shape.e_polyShape:
			{
				var poly = shape;
				var tV = b2Math.AddVV(poly.m_position, b2Math.b2MulMV(poly.m_R, poly.m_vertices[0]));
				var x = tV.x;
				var y = tV.y;
				for (var i = 0; i < poly.m_vertexCount; i++)
				{
					var v = b2Math.AddVV(poly.m_position, b2Math.b2MulMV(poly.m_R, poly.m_vertices[i]));

					stage.drawLine(x, y, v.x, v.y, 1, "#fff");
					
					x = v.x;
					y = v.y;
				}
				
				stage.drawLine(x, y, tV.x, tV.y, 1, "#fff");
			}
			break;
	}
}

